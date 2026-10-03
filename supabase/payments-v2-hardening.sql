-- Ejecutar después de payments-v2.sql, antes de desplegar el código que crea enlaces con vencimiento.
-- Los enlaces antiguos sin fecha de vencimiento siguen considerándose vigentes.
begin;

alter table public.payments
add column if not exists provider_expires_at timestamptz;

-- Solo un enlace nuevo pendiente por pedido; los enlaces heredados requieren revisión manual.
create unique index if not exists payments_one_pending_mp_link_per_order
on public.payments(order_id)
where provider = 'mercadopago' and status = 'pending'
  and provider_expires_at is not null;

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

  if tg_op <> 'DELETE' then
    if new.provider = 'manual' and new.status = 'confirmed'
       and exists (
         select 1 from public.payments p
         where p.order_id = v_order_id
           and p.provider = 'mercadopago'
           and p.status = 'pending'
           and (p.provider_expires_at is null or p.provider_expires_at > now())
       ) then
      raise exception 'Hay un enlace de Mercado Pago vigente para este pedido'
        using errcode='22023';
    end if;
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
$$;

revoke all on function public.sync_order_confirmed_payments() from public;

drop trigger if exists sync_order_confirmed_payments_trigger on public.payments;
create trigger sync_order_confirmed_payments_trigger
after insert or delete or update of status, amount_cents, order_id
on public.payments
for each row
execute function public.sync_order_confirmed_payments();


-- Evita que el total se modifique o el pedido se cancele mientras el cliente
-- todavía puede abrir un enlace por el importe anterior.
create or replace function public.guard_order_with_active_mp()
returns trigger
language plpgsql
security definer
set search_path=''
as $
begin
  if (new.total_cents is distinct from old.total_cents
      or (new.status = 'Cancelado' and old.status is distinct from new.status))
     and exists (
       select 1 from public.payments p
       where p.order_id = new.id
         and p.provider = 'mercadopago'
         and p.status = 'pending'
         and (p.provider_expires_at is null or p.provider_expires_at > now())
     ) then
    raise exception 'Hay un enlace de Mercado Pago vigente para este pedido'
      using errcode='22023';
  end if;
  return new;
end;
$;

revoke all on function public.guard_order_with_active_mp() from public;

drop trigger if exists guard_order_with_active_mp_trigger on public.orders;
create trigger guard_order_with_active_mp_trigger
before update of total_cents, status on public.orders
for each row
execute function public.guard_order_with_active_mp();

commit;
