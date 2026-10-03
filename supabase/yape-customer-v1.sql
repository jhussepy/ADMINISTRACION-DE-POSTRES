-- Yape para clientes: enlace privado por pedido y un comprobante pendiente por vez.
-- Ejecutar después de payments-v2-hardening.sql, antes de desplegar la página de pago.
begin;

alter table public.orders
  add column if not exists yape_payment_token uuid;

update public.orders
set yape_payment_token = gen_random_uuid()
where yape_payment_token is null;

alter table public.orders
  alter column yape_payment_token set default gen_random_uuid(),
  alter column yape_payment_token set not null;

create unique index if not exists orders_yape_payment_token_uidx
on public.orders(yape_payment_token);

create unique index if not exists payments_one_customer_yape_pending_uidx
on public.payments(order_id)
where provider = 'manual'
  and method = 'yape'
  and status = 'pending'
  and created_by = 'customer';

commit;
