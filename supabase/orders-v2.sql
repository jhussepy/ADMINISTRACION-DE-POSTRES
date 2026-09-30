-- Pedidos V2 · solicitudes web automáticas, código público y snapshot histórico.
-- Ejecutar una sola vez después de new-product-v4.sql.
begin;

create sequence if not exists public.order_public_number_seq;

create or replace function public.next_order_code()
returns text
language sql
volatile
security definer
set search_path=''
as $$
  select
    'YMP-' ||
    to_char(timezone('America/Lima', now()), 'YYYY') ||
    '-' ||
    lpad(nextval('public.order_public_number_seq'::regclass)::text, 4, '0');
$$;

revoke all on function public.next_order_code() from public;
grant execute on function public.next_order_code() to authenticated;

alter table public.orders
  add column if not exists public_code text,
  add column if not exists source text not null default 'manual',
  add column if not exists customer_user_id text,
  add column if not exists delivery_method text,
  add column if not exists delivery_address text not null default '',
  add column if not exists occasion text not null default '',
  add column if not exists gift_note text not null default '',
  add column if not exists notes text not null default '',
  add column if not exists cake_guests integer,
  add column if not exists cake_flavor text not null default '',
  add column if not exists cake_design text not null default '',
  add column if not exists quote_required boolean not null default false,
  add column if not exists checkout_key uuid;

update public.orders
set public_code = public.next_order_code()
where public_code is null;

update public.orders
set status = 'Por confirmar'
where status = 'Pendiente';

alter table public.orders
  alter column public_code set default public.next_order_code(),
  alter column public_code set not null;

alter table public.orders
  drop constraint if exists orders_status_check;
alter table public.orders
  add constraint orders_status_check
  check (
    status in (
      'Nuevo',
      'Por confirmar',
      'Confirmado',
      'En preparación',
      'Listo',
      'Entregado',
      'Cancelado'
    )
  );

alter table public.orders
  alter column status set default 'Por confirmar';

alter table public.orders
  drop constraint if exists orders_total_cents_check;
alter table public.orders
  add constraint orders_total_cents_check
  check(total_cents between 0 and 99999999);

alter table public.orders
  drop constraint if exists orders_deposit_cents_check;
alter table public.orders
  add constraint orders_deposit_cents_check
  check(deposit_cents >= 0 and deposit_cents <= total_cents);

alter table public.orders
  drop constraint if exists orders_source_check;
alter table public.orders
  add constraint orders_source_check
  check(source in ('manual','web'));

alter table public.orders
  drop constraint if exists orders_delivery_method_check;
alter table public.orders
  add constraint orders_delivery_method_check
  check(delivery_method is null or delivery_method in ('recojo','delivery'));

alter table public.orders
  drop constraint if exists orders_cake_guests_check;
alter table public.orders
  add constraint orders_cake_guests_check
  check(cake_guests is null or cake_guests between 1 and 500);

create unique index if not exists orders_public_code_uidx
on public.orders(public_code);

create unique index if not exists orders_checkout_key_uidx
on public.orders(checkout_key)
where checkout_key is not null;

create index if not exists orders_customer_user_idx
on public.orders(customer_user_id)
where customer_user_id is not null;

create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  position integer not null check(position between 1 and 100),
  product_id text,
  product_name text not null check(char_length(product_name) between 1 and 120),
  variant_key text not null check(char_length(variant_key) between 1 and 50),
  variant_label text not null check(char_length(variant_label) between 1 and 120),
  quantity integer not null check(quantity between 1 and 20),
  unit_price_cents integer check(unit_price_cents between 0 and 99999999),
  line_total_cents integer check(line_total_cents between 0 and 99999999),
  quote_required boolean not null default false,
  created_at timestamptz not null default now(),
  unique(order_id, position)
);

alter table public.order_items enable row level security;
revoke all on public.order_items from anon, authenticated;
grant select, insert, update, delete on public.order_items to authenticated;

drop policy if exists "Admin order items only" on public.order_items;
create policy "Admin order items only"
on public.order_items
for all
to authenticated
using((select public.is_admin()))
with check((select public.is_admin()));

create index if not exists order_items_order_idx
on public.order_items(order_id, position);

create or replace function public.create_checkout_order_v2(
  p_checkout_key uuid,
  p_customer_name text,
  p_customer_phone text,
  p_delivery_method text,
  p_delivery_address text,
  p_delivery_date date,
  p_occasion text,
  p_gift_note text,
  p_notes text,
  p_cake_guests integer,
  p_cake_flavor text,
  p_cake_design text,
  p_items jsonb
)
returns jsonb
language plpgsql
security definer
set search_path=''
as $$
declare
  v_existing public.orders%rowtype;
  v_order public.orders%rowtype;
  v_item jsonb;
  v_lines jsonb := '[]'::jsonb;
  v_line jsonb;
  v_position integer := 0;
  v_product_id text;
  v_variant_key text;
  v_quantity integer;
  v_product_name text;
  v_product_presentation text;
  v_product_price integer;
  v_variant_label text;
  v_variant_price integer;
  v_variant_found boolean;
  v_has_real_variants boolean;
  v_unit_price integer;
  v_line_total integer;
  v_total bigint := 0;
  v_quote_required boolean := false;
  v_user_id text := nullif(auth.jwt()->>'sub','');
begin
  if p_checkout_key is null then
    raise exception 'Identificador de checkout requerido' using errcode='22023';
  end if;

  select *
  into v_existing
  from public.orders
  where checkout_key = p_checkout_key
  limit 1;

  if found then
    return jsonb_build_object(
      'id', v_existing.id,
      'public_code', v_existing.public_code,
      'total_cents', v_existing.total_cents,
      'quote_required', v_existing.quote_required
    );
  end if;

  p_customer_name := btrim(coalesce(p_customer_name,''));
  p_customer_phone := btrim(coalesce(p_customer_phone,''));
  p_delivery_address := btrim(coalesce(p_delivery_address,''));
  p_occasion := btrim(coalesce(p_occasion,''));
  p_gift_note := btrim(coalesce(p_gift_note,''));
  p_notes := btrim(coalesce(p_notes,''));
  p_cake_flavor := btrim(coalesce(p_cake_flavor,''));
  p_cake_design := btrim(coalesce(p_cake_design,''));

  if char_length(p_customer_name) not between 2 and 100 then
    raise exception 'Nombre de cliente inválido' using errcode='22023';
  end if;

  if char_length(p_customer_phone) not between 7 and 20
     or p_customer_phone !~ '^[+0-9 ()-]+$' then
    raise exception 'Teléfono inválido' using errcode='22023';
  end if;

  if p_delivery_method not in ('recojo','delivery') then
    raise exception 'Modalidad de entrega inválida' using errcode='22023';
  end if;

  if p_delivery_method = 'delivery'
     and char_length(p_delivery_address) not between 8 and 250 then
    raise exception 'Dirección inválida' using errcode='22023';
  end if;

  if p_delivery_date is null
     or p_delivery_date < (timezone('America/Lima', now()))::date then
    raise exception 'Fecha inválida' using errcode='22023';
  end if;

  if char_length(p_occasion) > 80
     or char_length(p_gift_note) > 180
     or char_length(p_notes) > 500
     or char_length(p_cake_flavor) > 80
     or char_length(p_cake_design) > 300
     or (p_cake_guests is not null and p_cake_guests not between 1 and 500) then
    raise exception 'Detalles del pedido inválidos' using errcode='22023';
  end if;

  if p_items is null
     or jsonb_typeof(p_items) <> 'array'
     or jsonb_array_length(p_items) < 1
     or jsonb_array_length(p_items) > 100 then
    raise exception 'Carrito inválido' using errcode='22023';
  end if;

  for v_item in
    select value from jsonb_array_elements(p_items)
  loop
    v_position := v_position + 1;

    if jsonb_typeof(v_item) <> 'object' then
      raise exception 'Línea de carrito inválida' using errcode='22023';
    end if;

    v_product_id := coalesce(v_item->>'product_id','');
    v_variant_key := coalesce(v_item->>'variant_id','');

    if v_product_id !~ '^[A-Za-z0-9_-]{1,80}$'
       or v_variant_key !~ '^[a-z0-9]+(-[a-z0-9]+)*$'
       or char_length(v_variant_key) > 50
       or coalesce(v_item->>'quantity','') !~ '^[1-9][0-9]?$' then
      raise exception 'Línea de carrito inválida' using errcode='22023';
    end if;

    v_quantity := (v_item->>'quantity')::integer;
    if v_quantity > 20 then
      raise exception 'Cantidad inválida' using errcode='22023';
    end if;

    select name, presentation, price_cents
    into v_product_name, v_product_presentation, v_product_price
    from public.products
    where id = v_product_id
      and active
    limit 1;

    if not found then
      raise exception 'Producto no disponible' using errcode='22023';
    end if;

    select label, price_cents
    into v_variant_label, v_variant_price
    from public.product_variants
    where product_id = v_product_id
      and slug = v_variant_key
      and active
    limit 1;

    v_variant_found := found;

    if v_variant_found then
      v_unit_price := v_variant_price;
    else
      select exists(
        select 1
        from public.product_variants
        where product_id = v_product_id
          and active
      )
      into v_has_real_variants;

      if v_has_real_variants then
        raise exception 'Presentación no disponible' using errcode='22023';
      end if;

      -- Productos aún no migrados a Commerce V2 se registran como solicitud
      -- por cotizar. Nunca se confía en un precio de ejemplo del navegador.
      v_variant_label := v_product_presentation;
      v_unit_price := v_product_price;
    end if;

    if v_unit_price is null then
      v_line_total := null;
      v_quote_required := true;
    else
      v_line_total := v_unit_price * v_quantity;
      v_total := v_total + v_line_total;
    end if;

    v_lines := v_lines || jsonb_build_array(
      jsonb_build_object(
        'position', v_position,
        'product_id', v_product_id,
        'product_name', v_product_name,
        'variant_key', v_variant_key,
        'variant_label', v_variant_label,
        'quantity', v_quantity,
        'unit_price_cents', v_unit_price,
        'line_total_cents', v_line_total,
        'quote_required', v_unit_price is null
      )
    );
  end loop;

  if v_total > 99999999 then
    raise exception 'Importe total fuera de rango' using errcode='22023';
  end if;

  begin
    insert into public.orders(
      customer_name,
      customer_phone,
      details,
      delivery_date,
      total_cents,
      deposit_cents,
      status,
      source,
      customer_user_id,
      delivery_method,
      delivery_address,
      occasion,
      gift_note,
      notes,
      cake_guests,
      cake_flavor,
      cake_design,
      quote_required,
      checkout_key
    )
    values(
      p_customer_name,
      p_customer_phone,
      'Solicitud creada automáticamente desde la tienda web.',
      p_delivery_date,
      v_total::integer,
      0,
      'Nuevo',
      'web',
      v_user_id,
      p_delivery_method,
      case when p_delivery_method='delivery' then p_delivery_address else '' end,
      p_occasion,
      p_gift_note,
      p_notes,
      p_cake_guests,
      p_cake_flavor,
      p_cake_design,
      v_quote_required,
      p_checkout_key
    )
    returning * into v_order;
  exception
    when unique_violation then
      select *
      into v_existing
      from public.orders
      where checkout_key = p_checkout_key
      limit 1;

      if found then
        return jsonb_build_object(
          'id', v_existing.id,
          'public_code', v_existing.public_code,
          'total_cents', v_existing.total_cents,
          'quote_required', v_existing.quote_required
        );
      end if;
      raise;
  end;

  for v_line in
    select value from jsonb_array_elements(v_lines)
  loop
    insert into public.order_items(
      order_id,
      position,
      product_id,
      product_name,
      variant_key,
      variant_label,
      quantity,
      unit_price_cents,
      line_total_cents,
      quote_required
    )
    values(
      v_order.id,
      (v_line->>'position')::integer,
      v_line->>'product_id',
      v_line->>'product_name',
      v_line->>'variant_key',
      v_line->>'variant_label',
      (v_line->>'quantity')::integer,
      nullif(v_line->>'unit_price_cents','')::integer,
      nullif(v_line->>'line_total_cents','')::integer,
      (v_line->>'quote_required')::boolean
    );
  end loop;

  return jsonb_build_object(
    'id', v_order.id,
    'public_code', v_order.public_code,
    'total_cents', v_order.total_cents,
    'quote_required', v_order.quote_required
  );
end;
$$;

revoke all on function public.create_checkout_order_v2(
  uuid,text,text,text,text,date,text,text,text,integer,text,text,jsonb
) from public;

grant execute on function public.create_checkout_order_v2(
  uuid,text,text,text,text,date,text,text,text,integer,text,text,jsonb
) to anon, authenticated;

commit;
