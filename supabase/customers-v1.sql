-- Clientes V1 + Timeline · CRM operativo de Repostería Yemape.
-- Ejecutar una sola vez después de orders-v2.sql.
begin;

create or replace function public.normalize_customer_phone(input_phone text)
returns text
language sql
immutable
set search_path=''
as $$
  with cleaned as (
    select regexp_replace(coalesce(input_phone, ''), '[^0-9]', '', 'g') as digits
  )
  select case
    when digits ~ '^0051[0-9]{9}$' then substr(digits, 5)
    when digits ~ '^51[0-9]{9}$' then substr(digits, 3)
    else digits
  end
  from cleaned;
$$;

revoke all on function public.normalize_customer_phone(text) from public;

create table if not exists public.customers (
  id uuid primary key default gen_random_uuid(),
  normalized_phone text not null unique
    check(normalized_phone ~ '^[0-9]{7,20}$'),
  phone text not null check(char_length(phone) between 7 and 20),
  full_name text not null check(char_length(full_name) between 2 and 100),
  clerk_user_id text,
  last_delivery_method text
    check(last_delivery_method is null or last_delivery_method in ('recojo','delivery')),
  last_delivery_address text not null default ''
    check(char_length(last_delivery_address) <= 250),
  last_order_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists customers_last_order_idx
on public.customers(last_order_at desc nulls last);

create index if not exists customers_name_idx
on public.customers(lower(full_name));

alter table public.customers enable row level security;
revoke all on public.customers from anon, authenticated;
grant select, update on public.customers to authenticated;

drop policy if exists "Admin customers only" on public.customers;
create policy "Admin customers only"
on public.customers
for all
to authenticated
using((select public.is_admin()))
with check((select public.is_admin()));

alter table public.orders
  add column if not exists customer_id uuid;

insert into public.customers(
  normalized_phone,
  phone,
  full_name,
  clerk_user_id,
  last_delivery_method,
  last_delivery_address,
  last_order_at,
  created_at,
  updated_at
)
select distinct on (public.normalize_customer_phone(o.customer_phone))
  public.normalize_customer_phone(o.customer_phone),
  o.customer_phone,
  o.customer_name,
  o.customer_user_id,
  o.delivery_method,
  case
    when o.delivery_method = 'delivery' then o.delivery_address
    else ''
  end,
  o.created_at,
  o.created_at,
  now()
from public.orders o
where public.normalize_customer_phone(o.customer_phone) ~ '^[0-9]{7,20}$'
order by
  public.normalize_customer_phone(o.customer_phone),
  o.created_at desc
on conflict (normalized_phone) do update set
  phone = excluded.phone,
  full_name = excluded.full_name,
  clerk_user_id = coalesce(excluded.clerk_user_id, public.customers.clerk_user_id),
  last_delivery_method = coalesce(excluded.last_delivery_method, public.customers.last_delivery_method),
  last_delivery_address = case
    when excluded.last_delivery_address <> '' then excluded.last_delivery_address
    else public.customers.last_delivery_address
  end,
  last_order_at = greatest(public.customers.last_order_at, excluded.last_order_at),
  updated_at = now();

update public.orders o
set customer_id = c.id
from public.customers c
where o.customer_id is null
  and c.normalized_phone = public.normalize_customer_phone(o.customer_phone);

alter table public.orders
  drop constraint if exists orders_customer_id_fkey;

alter table public.orders
  add constraint orders_customer_id_fkey
  foreign key (customer_id)
  references public.customers(id)
  on delete set null;

create index if not exists orders_customer_id_idx
on public.orders(customer_id, created_at desc)
where customer_id is not null;

create or replace function public.sync_order_customer()
returns trigger
language plpgsql
security definer
set search_path=''
as $$
declare
  v_normalized text;
  v_customer_id uuid;
begin
  v_normalized := public.normalize_customer_phone(new.customer_phone);

  if v_normalized !~ '^[0-9]{7,20}$' then
    new.customer_id := null;
    return new;
  end if;

  insert into public.customers(
    normalized_phone,
    phone,
    full_name,
    clerk_user_id,
    last_delivery_method,
    last_delivery_address,
    last_order_at,
    created_at,
    updated_at
  )
  values(
    v_normalized,
    new.customer_phone,
    new.customer_name,
    new.customer_user_id,
    new.delivery_method,
    case
      when new.delivery_method = 'delivery' then new.delivery_address
      else ''
    end,
    coalesce(new.created_at, now()),
    coalesce(new.created_at, now()),
    now()
  )
  on conflict (normalized_phone) do update set
    phone = excluded.phone,
    full_name = excluded.full_name,
    clerk_user_id = coalesce(excluded.clerk_user_id, public.customers.clerk_user_id),
    last_delivery_method = coalesce(excluded.last_delivery_method, public.customers.last_delivery_method),
    last_delivery_address = case
      when excluded.last_delivery_address <> '' then excluded.last_delivery_address
      else public.customers.last_delivery_address
    end,
    last_order_at = greatest(
      coalesce(public.customers.last_order_at, excluded.last_order_at),
      excluded.last_order_at
    ),
    updated_at = now()
  returning id into v_customer_id;

  new.customer_id := v_customer_id;
  return new;
end;
$$;

revoke all on function public.sync_order_customer() from public;

drop trigger if exists sync_order_customer_trigger on public.orders;
create trigger sync_order_customer_trigger
before insert or update of
  customer_name,
  customer_phone,
  customer_user_id,
  delivery_method,
  delivery_address
on public.orders
for each row
execute function public.sync_order_customer();

create table if not exists public.customer_notes (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers(id) on delete cascade,
  note text not null check(char_length(note) between 2 and 1000),
  created_by text not null default coalesce(nullif(auth.jwt()->>'sub',''),'system'),
  created_at timestamptz not null default now()
);

create index if not exists customer_notes_customer_idx
on public.customer_notes(customer_id, created_at desc);

alter table public.customer_notes enable row level security;
revoke all on public.customer_notes from anon, authenticated;
grant select, insert, delete on public.customer_notes to authenticated;

drop policy if exists "Admin customer notes only" on public.customer_notes;
create policy "Admin customer notes only"
on public.customer_notes
for all
to authenticated
using((select public.is_admin()))
with check((select public.is_admin()));

create table if not exists public.order_events (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  event_type text not null
    check(event_type in ('status_change','quote_resolved','payment_update','total_update')),
  from_status text,
  to_status text,
  amount_cents integer check(amount_cents is null or amount_cents between 0 and 99999999),
  actor_user_id text,
  actor_role text not null default 'system'
    check(actor_role in ('admin','customer','system')),
  created_at timestamptz not null default now()
);

create index if not exists order_events_order_idx
on public.order_events(order_id, created_at asc);

alter table public.order_events enable row level security;
revoke all on public.order_events from anon, authenticated;
grant select on public.order_events to authenticated;

drop policy if exists "Admin order events only" on public.order_events;
create policy "Admin order events only"
on public.order_events
for select
to authenticated
using((select public.is_admin()));

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

  if new.deposit_cents is distinct from old.deposit_cents then
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

revoke all on function public.log_order_changes() from public;

drop trigger if exists log_order_changes_trigger on public.orders;
create trigger log_order_changes_trigger
after update of status, quote_required, total_cents, deposit_cents
on public.orders
for each row
execute function public.log_order_changes();

commit;
