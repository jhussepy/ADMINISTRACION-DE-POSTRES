-- Impide ofrecer Yape y Mercado Pago a la vez para un mismo pedido.
-- Ejecutar después de yape-customer-v1.sql y payments-v2-hardening.sql.
begin;

do $check$
begin
  if exists (
    select 1
    from public.payments y
    join public.payments mp on mp.order_id = y.order_id
    where y.provider = 'manual'
      and y.method = 'yape'
      and y.status = 'pending'
      and mp.provider = 'mercadopago'
      and mp.status = 'pending'
      and (mp.provider_expires_at is null or mp.provider_expires_at > now())
  ) then
    raise exception 'Hay pedidos con Yape pendiente y Mercado Pago vigente; concílialos antes de aplicar esta migración'
      using errcode='22023';
  end if;
end;
$check$;

create or replace function public.guard_overlapping_payment_channels()
returns trigger
language plpgsql
security definer
set search_path=''
as $$
declare
  v_order_id uuid;
begin
  if new.status <> 'pending' then
    return new;
  end if;

  if new.provider = 'mercadopago'
     or (new.provider = 'manual' and new.method = 'yape') then
    -- Serializa inserciones concurrentes de ambos canales en el mismo pedido.
    select id into v_order_id
    from public.orders
    where id = new.order_id
    for update;

    if new.provider = 'mercadopago' and exists (
      select 1 from public.payments p
      where p.order_id = new.order_id
        and p.id <> new.id
        and p.provider = 'manual'
        and p.method = 'yape'
        and p.status = 'pending'
    ) then
      raise exception 'Hay un pago Yape pendiente de verificación'
        using errcode='22023';
    end if;

    if new.provider = 'manual' and new.method = 'yape' and exists (
      select 1 from public.payments p
      where p.order_id = new.order_id
        and p.id <> new.id
        and p.provider = 'mercadopago'
        and p.status = 'pending'
        and (p.provider_expires_at is null or p.provider_expires_at > now())
    ) then
      raise exception 'Hay un enlace Mercado Pago vigente para este pedido'
        using errcode='22023';
    end if;
  end if;

  return new;
end;
$$;

revoke all on function public.guard_overlapping_payment_channels() from public;

drop trigger if exists guard_overlapping_payment_channels_trigger on public.payments;
create trigger guard_overlapping_payment_channels_trigger
before insert or update of status, provider, method, created_by, order_id, amount_cents, provider_expires_at
on public.payments
for each row
execute function public.guard_overlapping_payment_channels();

commit;
