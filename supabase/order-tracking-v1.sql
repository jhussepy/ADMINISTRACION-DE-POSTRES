-- Seguimiento privado para pedidos con o sin cuenta. Ejecutar una vez después de orders-v2.sql.
begin;

alter table public.orders
  add column if not exists tracking_token uuid;

update public.orders
set tracking_token = gen_random_uuid()
where tracking_token is null;

alter table public.orders
  alter column tracking_token set default gen_random_uuid(),
  alter column tracking_token set not null;

create unique index if not exists orders_tracking_token_uidx
on public.orders(tracking_token);

-- No se conceden permisos públicos sobre orders: la página lee solo datos
-- seleccionados mediante la clave de servicio en el servidor.
commit;
