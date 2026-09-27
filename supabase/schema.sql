-- Ejecutar en Supabase SQL Editor antes de habilitar las variables en Vercel.
begin;
create table if not exists public.admins (
  user_id uuid primary key references auth.users(id) on delete cascade
);
alter table public.admins enable row level security;
revoke all on public.admins from anon, authenticated;
grant select on public.admins to authenticated;
drop policy if exists "Read own admin membership" on public.admins;
create policy "Read own admin membership" on public.admins for select to authenticated using(user_id=(select auth.uid()));
create or replace function public.is_admin() returns boolean language sql stable security definer set search_path='' as $$
  select exists(select 1 from public.admins where user_id=(select auth.uid()));
$$;
revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '' check(char_length(full_name)<=100),
  address text not null default '' check(char_length(address)<=250),
  phone text not null default '' check(char_length(phone)<=20)
);
alter table public.profiles enable row level security;
revoke all on public.profiles from anon, authenticated;
grant select,insert,update,delete on public.profiles to authenticated;
drop policy if exists "Own profile only" on public.profiles;
create policy "Own profile only" on public.profiles for all to authenticated using(id=(select auth.uid())) with check(id=(select auth.uid()));

create table if not exists public.products (
  id text primary key check(char_length(id) between 1 and 80),
  name text not null check(char_length(name) between 3 and 120),
  description text not null default '' check(char_length(description)<=500),
  category text not null,
  presentation text not null check(char_length(presentation) between 2 and 120),
  price_cents integer check(price_cents between 0 and 99999999),
  image text not null,
  active boolean not null default true,
  sort_order integer not null default 10 check(sort_order between 0 and 999)
);
-- Ampliar las opciones también si se ejecuta sobre una instalación anterior.
alter table public.products drop constraint if exists products_category_check;
alter table public.products add constraint products_category_check check(category in ('Cheesecakes','Tortas','Kekes','Postres','Salados'));
alter table public.products drop constraint if exists products_image_check;
alter table public.products add constraint products_image_check check(image in ('/images/fresa.webp','/images/maracumango.webp','/images/tortas.webp','/images/triples.webp','/images/torta-chocolate.webp','/images/terremoto-lucuma.webp','/images/keke-arandanos.webp'));
alter table public.products enable row level security;
revoke all on public.products from anon, authenticated;
grant select on public.products to anon, authenticated;
grant insert,update,delete on public.products to authenticated;
drop policy if exists "Read active products" on public.products;
create policy "Read active products" on public.products for select to anon, authenticated using(active);
drop policy if exists "Admin products" on public.products;
create policy "Admin products" on public.products for all to authenticated using((select public.is_admin())) with check((select public.is_admin()));

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  customer_name text not null check(char_length(customer_name) between 2 and 100),
  customer_phone text not null check(char_length(customer_phone) between 7 and 20),
  details text not null check(char_length(details) between 3 and 2000),
  delivery_date date not null,
  total_cents integer not null check(total_cents between 1 and 99999999),
  deposit_cents integer not null default 0 check(deposit_cents>=0 and deposit_cents<=total_cents),
  status text not null default 'Pendiente' check(status in ('Pendiente','Confirmado','En preparación','Entregado','Cancelado')),
  created_at timestamptz not null default now()
);
alter table public.orders enable row level security;
revoke all on public.orders from anon, authenticated;
grant select,insert,update,delete on public.orders to authenticated;
drop policy if exists "Admin orders only" on public.orders;
create policy "Admin orders only" on public.orders for all to authenticated using((select public.is_admin())) with check((select public.is_admin()));
create index if not exists orders_delivery_date_idx on public.orders(delivery_date desc);
create index if not exists orders_status_idx on public.orders(status);


-- Agregar en la base de datos evita truncar el resumen al límite de filas de la API.
create or replace function public.admin_summary(today date) returns jsonb
language plpgsql stable security invoker set search_path='' as $$
begin
  if not public.is_admin() then
    raise exception 'Acceso no autorizado' using errcode='42501';
  end if;
  return jsonb_build_object(
    'products', (select count(*) from public.products where active),
    'pending', (select count(*) from public.orders where status not in ('Cancelado','Entregado')),
    'today', (select count(*) from public.orders where status not in ('Cancelado','Entregado') and delivery_date=today),
    'outstanding', (select coalesce(sum(total_cents::bigint-deposit_cents),0) from public.orders where status<>'Cancelado')
  );
end;
$$;
revoke all on function public.admin_summary(date) from public;
grant execute on function public.admin_summary(date) to authenticated;

insert into public.products(id,name,description,category,presentation,price_cents,image,active,sort_order) values
('torta-chocolate','Torta de chocolate','Chocolate para celebrar y compartir. Consulta las presentaciones y opciones de decoración disponibles.','Tortas','Tamaño por coordinar',null,'/images/torta-chocolate.webp',true,1),
('terremoto-lucuma','Terremoto de lúcuma','Un antojo de lúcuma y chocolate para disfrutar a cucharadas. Consulta la presentación disponible.','Postres','Presentación por coordinar',null,'/images/terremoto-lucuma.webp',true,2),
('keke-arandanos','Keke de arándanos','El compañero de una pausa con café o de una tarde para compartir. Consulta tamaños y porciones disponibles.','Kekes','Tamaño por coordinar',null,'/images/keke-arandanos.webp',true,3),
('cheesecake-fresa','Cheesecake de fresa','Una pausa dulce con el encanto de las fresas. Consulta tamaños y porciones disponibles.','Cheesecakes','Presentación por coordinar',null,'/images/fresa.webp',true,4),
('cheesecake-maracumango','Cheesecake de maracumango','El encuentro de dos sabores tropicales para compartir un momento especial.','Cheesecakes','Presentación por coordinar',null,'/images/maracumango.webp',true,5),
('torta-personalizada','Tu torta, tu celebración','Cuéntanos tu idea, la temática y para cuántas personas. Coordinamos contigo cada detalle.','Tortas','Diseño personalizado',null,'/images/tortas.webp',true,6),
('triples','Triples de jamón, queso y tocino','También hay lugar para un antojo salado. Consulta las presentaciones para tu reunión.','Salados','Cantidad por coordinar',null,'/images/triples.webp',true,7)
-- Reubicar solo las posiciones originales de los cuatro productos anteriores.
-- Conservar precios, textos, visibilidad y cualquier otra posición personalizada.
on conflict(id) do update set sort_order=excluded.sort_order
where products.id in ('cheesecake-fresa','cheesecake-maracumango','torta-personalizada','triples')
  and products.sort_order=excluded.sort_order-3;
commit;

-- Conceder administración SOLO desde SQL Editor, después de crear y verificar la cuenta.
-- Reemplazar el correo antes de ejecutar estas líneas por separado:
-- insert into public.admins(user_id)
-- select id from auth.users where lower(email)=lower('TU_CORREO_VERIFICADO') and email_confirmed_at is not null
-- on conflict do nothing;
