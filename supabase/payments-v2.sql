-- Pagos V2 · inspirado en las garantías de PagoKit.
-- Ejecutar una sola vez después de customers-v1.sql.
begin;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'payment-proofs',
  'payment-proofs',
  false,
  5242880,
  array['image/jpeg','image/png','image/webp','application/pdf']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  provider text not null default 'manual'
    check(provider in ('manual','mercadopago')),
  method text not null
    check(method in ('yape','plin','transferencia','efectivo','mercadopago','otro')),
  status text not null default 'pending'
    check(status in ('pending','confirmed','rejected','refunded','failed')),
  amount_cents integer not null
    check(amount_cents between 1 and 99999999),
  currency text not null default 'PEN'
    check(currency = 'PEN'),
  reference text not null default ''
    check(char_length(reference) <= 120),
  note text not null default ''
    check(char_length(note) <= 500),
  provider_payment_id text,
  provider_preference_id text,
  provider_checkout_url text
    check(provider_checkout_url is null or char_length(provider_checkout_url) <= 1200),
  idempotency_key uuid,
  paid_at timestamptz,
  verified_at timestamptz,
  created_by text not null default coalesce(nullif(auth.jwt()->>'sub',''),'system'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists payments_order_idx
on public.payments(order_id, created_at desc);

create index if not exists payments_status_idx
on public.payments(status, created_at desc);

create unique index if not exists payments_provider_payment_uidx
on public.payments(provider, provider_payment_id)
where provider_payment_id is not null;

create unique index if not exists payments_idempotency_uidx
on public.payments(idempotency_key)
where idempotency_key is not null;

alter table public.payments enable row level security;
revoke all on public.payments from anon, authenticated;
grant select, insert, update, delete on public.payments to authenticated;

drop policy if exists "Admin payments only" on public.payments;
create policy "Admin payments only"
on public.payments
for all
to authenticated
using((select public.is_admin()))
with check((select public.is_admin()));

create table if not exists public.payment_proofs (
  id uuid primary key default gen_random_uuid(),
  payment_id uuid not null references public.payments(id) on delete cascade,
  storage_path text not null unique
    check(char_length(storage_path) between 1 and 500),
  original_name text not null default ''
    check(char_length(original_name) <= 180),
  mime_type text not null
    check(mime_type in ('image/jpeg','image/png','image/webp','application/pdf')),
  size_bytes integer not null
    check(size_bytes between 1 and 5242880),
  uploaded_by text not null default coalesce(nullif(auth.jwt()->>'sub',''),'system'),
  created_at timestamptz not null default now()
);

create index if not exists payment_proofs_payment_idx
on public.payment_proofs(payment_id, created_at desc);

alter table public.payment_proofs enable row level security;
revoke all on public.payment_proofs from anon, authenticated;
grant select, insert, delete on public.payment_proofs to authenticated;

drop policy if exists "Admin payment proofs only" on public.payment_proofs;
create policy "Admin payment proofs only"
on public.payment_proofs
for all
to authenticated
using((select public.is_admin()))
with check((select public.is_admin()));

drop policy if exists "Admin payment proof objects read" on storage.objects;
create policy "Admin payment proof objects read"
on storage.objects
for select
to authenticated
using(
  bucket_id = 'payment-proofs'
  and (select public.is_admin())
);

drop policy if exists "Admin payment proof objects insert" on storage.objects;
create policy "Admin payment proof objects insert"
on storage.objects
for insert
to authenticated
with check(
  bucket_id = 'payment-proofs'
  and (select public.is_admin())
);

drop policy if exists "Admin payment proof objects delete" on storage.objects;
create policy "Admin payment proof objects delete"
on storage.objects
for delete
to authenticated
using(
  bucket_id = 'payment-proofs'
  and (select public.is_admin())
);

create table if not exists public.payment_webhook_events (
  id uuid primary key default gen_random_uuid(),
  provider text not null check(provider in ('mercadopago')),
  event_id text not null check(char_length(event_id) between 1 and 180),
  event_type text not null default '' check(char_length(event_type) <= 120),
  provider_payment_id text,
  result text not null default 'received'
    check(result in ('received','processed','duplicate','unmatched','mismatch')),
  processed_at timestamptz not null default now(),
  unique(provider, event_id)
);

alter table public.payment_webhook_events enable row level security;
revoke all on public.payment_webhook_events from anon, authenticated;
grant select on public.payment_webhook_events to authenticated;

drop policy if exists "Admin payment webhook events read" on public.payment_webhook_events;
create policy "Admin payment webhook events read"
on public.payment_webhook_events
for select
to authenticated
using((select public.is_admin()));

-- Conserva adelantos previos convirtiéndolos en un pago histórico verificable.
insert into public.payments(
  order_id,
  provider,
  method,
  status,
  amount_cents,
  currency,
  reference,
  note,
  paid_at,
  verified_at,
  created_by,
  created_at,
  updated_at
)
select
  o.id,
  'manual',
  'otro',
  'confirmed',
  o.deposit_cents,
  'PEN',
  'Migrado desde Pedidos V2',
  'Adelanto existente antes de activar Pagos V2.',
  o.created_at,
  o.created_at,
  'system',
  o.created_at,
  now()
from public.orders o
where o.deposit_cents > 0
  and not exists (
    select 1 from public.payments p where p.order_id = o.id
  );

-- Evita que el trigger histórico duplique en el timeline cada sincronización automática.
create or replace function public.log_order_changes()
returns trigger
language plpgsql
security definer
set search_path=''
as $$
declare
  v_actor text := nullif(auth.jwt()->>'sub','');
  v_role text;
begin
  v_role := case
    when v_actor is null then 'system'
    when public.is_admin() then 'admin'
    else 'customer'
  end;

  if new.status is distinct from old.status then
    insert into public.order_events(
      order_id,event_type,from_status,to_status,actor_user_id,actor_role
    )
    values(
      new.id,'status_change',old.status,new.status,v_actor,v_role
    );
  end if;

  if old.quote_required = true and new.quote_required = false then
    insert into public.order_events(
      order_id,event_type,amount_cents,actor_user_id,actor_role
    )
    values(
      new.id,'quote_resolved',new.total_cents,v_actor,v_role
    );
  elsif new.total_cents is distinct from old.total_cents then
    insert into public.order_events(
      order_id,event_type,amount_cents,actor_user_id,actor_role
    )
    values(
      new.id,'total_update',new.total_cents,v_actor,v_role
    );
  end if;

  if new.deposit_cents is distinct from old.deposit_cents
     and coalesce(current_setting('app.payment_sync', true),'') <> '1' then
    insert into public.order_events(
      order_id,event_type,amount_cents,actor_user_id,actor_role
    )
    values(
      new.id,'payment_update',new.deposit_cents,v_actor,v_role
    );
  end if;

  return new;
end;
$$;

create or replace function public.sync_order_confirmed_payments()
returns trigger
language plpgsql
security definer
set search_path=''
as $$
declare
  v_order_id uuid;
  v_paid bigint;
  v_total integer;
begin
  if tg_op = 'UPDATE' and new.order_id is distinct from old.order_id then
    raise exception 'No se puede mover un pago entre pedidos';
  end if;

  v_order_id := case when tg_op = 'DELETE' then old.order_id else new.order_id end;

  select total_cents
  into v_total
  from public.orders
  where id = v_order_id
  for update;

  if not found then
    if tg_op = 'DELETE' then
      return old;
    end if;
    return new;
  end if;

  select coalesce(sum(amount_cents), 0)
  into v_paid
  from public.payments
  where order_id = v_order_id
    and status = 'confirmed';

  if v_paid > v_total then
    raise exception 'Los pagos confirmados no pueden superar el total del pedido'
      using errcode='22023';
  end if;

  perform set_config('app.payment_sync', '1', true);

  update public.orders
  set deposit_cents = v_paid::integer
  where id = v_order_id;

  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$;

revoke all on function public.sync_order_confirmed_payments() from public;

drop trigger if exists sync_order_confirmed_payments_trigger on public.payments;
create trigger sync_order_confirmed_payments_trigger
after insert or delete or update of status, amount_cents
on public.payments
for each row
execute function public.sync_order_confirmed_payments();

-- Webhook Mercado Pago: dedup + validación contra el pago local + cambio de estado
-- ocurren en una única transacción PostgreSQL.
create or replace function public.apply_mercadopago_payment_webhook(
  p_event_id text,
  p_event_type text,
  p_provider_payment_id text,
  p_payment_id uuid,
  p_status text,
  p_amount_cents integer,
  p_currency text,
  p_paid_at timestamptz
)
returns text
language plpgsql
security definer
set search_path=''
as $$
declare
  v_payment public.payments%rowtype;
  v_inserted uuid;
begin
  if p_event_id is null or char_length(p_event_id) not between 1 and 180
     or p_provider_payment_id is null or char_length(p_provider_payment_id) < 1
     or p_status not in ('pending','confirmed','rejected','refunded','failed')
     or p_amount_cents not between 1 and 99999999
     or p_currency <> 'PEN' then
    raise exception 'Evento de pago inválido' using errcode='22023';
  end if;

  insert into public.payment_webhook_events(
    provider,event_id,event_type,provider_payment_id,result
  )
  values(
    'mercadopago',
    p_event_id,
    left(coalesce(p_event_type,''),120),
    p_provider_payment_id,
    'received'
  )
  on conflict(provider,event_id) do nothing
  returning id into v_inserted;

  if v_inserted is null then
    return 'duplicate';
  end if;

  select *
  into v_payment
  from public.payments
  where id = p_payment_id
    and provider = 'mercadopago'
  for update;

  if not found then
    update public.payment_webhook_events
    set result = 'unmatched', processed_at = now()
    where id = v_inserted;
    return 'unmatched';
  end if;

  if v_payment.amount_cents <> p_amount_cents
     or v_payment.currency <> p_currency then
    update public.payment_webhook_events
    set result = 'mismatch', processed_at = now()
    where id = v_inserted;
    return 'mismatch';
  end if;

  update public.payments
  set
    status = p_status,
    provider_payment_id = p_provider_payment_id,
    paid_at = case
      when p_status = 'confirmed' then coalesce(p_paid_at, paid_at, now())
      else paid_at
    end,
    verified_at = case
      when p_status in ('confirmed','rejected','refunded') then now()
      else verified_at
    end,
    updated_at = now()
  where id = v_payment.id;

  update public.payment_webhook_events
  set result = 'processed', processed_at = now()
  where id = v_inserted;

  return 'processed';
end;
$$;

revoke all on function public.apply_mercadopago_payment_webhook(
  text,text,text,uuid,text,integer,text,timestamptz
) from public, anon, authenticated;

grant execute on function public.apply_mercadopago_payment_webhook(
  text,text,text,uuid,text,integer,text,timestamptz
) to service_role;

commit;
