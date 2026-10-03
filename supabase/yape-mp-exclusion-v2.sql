-- Ejecutar después de yape-mp-exclusion-v1.sql. Mantiene la exclusión
-- sin bloquear los avisos repetidos de Mercado Pago para pagos ya pendientes.
begin;

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

  -- Un webhook puede repetir UPDATE status='pending' sin abrir otro checkout.
  -- Solo se vuelve a comprobar si cambia el canal, pedido o vigencia.
  if tg_op = 'UPDATE' then
    if old.status = 'pending'
       and new.order_id is not distinct from old.order_id
       and new.provider is not distinct from old.provider
       and new.method is not distinct from old.method
       and new.provider_expires_at is not distinct from old.provider_expires_at then
      return new;
    end if;
  end if;

  if new.provider = 'mercadopago'
     or (new.provider = 'manual' and new.method = 'yape') then
    -- Serializa inserciones concurrentes de ambos canales en el mismo pedido.
    select id into v_order_id
    from public.orders
    where id = new.order_id
    for update;

    if new.provider = 'mercadopago'
       and (new.provider_expires_at is null or new.provider_expires_at > now())
       and exists (
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

commit;
