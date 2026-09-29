-- Commerce V2 · variantes reales por producto.
-- Ejecutar una sola vez en Supabase SQL Editor después del schema base.
begin;

create table if not exists public.product_variants (
  id uuid primary key default gen_random_uuid(),
  product_id text not null references public.products(id) on delete cascade,
  slug text not null check(
    char_length(slug) between 1 and 50
    and slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'
  ),
  label text not null check(char_length(label) between 2 and 120),
  price_cents integer check(price_cents between 0 and 99999999),
  active boolean not null default true,
  sort_order integer not null default 10 check(sort_order between 0 and 999),
  unique(product_id, slug)
);

alter table public.product_variants enable row level security;
revoke all on public.product_variants from anon, authenticated;
grant select on public.product_variants to anon, authenticated;
grant insert, update, delete on public.product_variants to authenticated;

drop policy if exists "Read active product variants" on public.product_variants;
create policy "Read active product variants"
on public.product_variants
for select
to anon, authenticated
using (
  active
  and exists (
    select 1
    from public.products p
    where p.id = product_variants.product_id
      and p.active
  )
);

drop policy if exists "Admin product variants" on public.product_variants;
create policy "Admin product variants"
on public.product_variants
for all
to authenticated
using ((select public.is_admin()))
with check ((select public.is_admin()));

create index if not exists product_variants_product_order_idx
on public.product_variants(product_id, sort_order);

commit;
