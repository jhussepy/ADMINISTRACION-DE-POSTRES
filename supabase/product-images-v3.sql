-- Admin V2 · galería de imágenes administrable con Supabase Storage.
-- Ejecutar una sola vez después de clerk-auth.sql.
begin;

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'product-images',
  'product-images',
  true,
  5242880,
  array['image/jpeg','image/png','image/webp']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create table if not exists public.product_images (
  id uuid primary key default gen_random_uuid(),
  product_id text not null references public.products(id) on delete cascade,
  storage_path text not null unique check(char_length(storage_path) between 5 and 300),
  alt_text text not null default '' check(char_length(alt_text) <= 160),
  is_cover boolean not null default false,
  active boolean not null default true,
  sort_order integer not null default 10 check(sort_order between 0 and 999),
  created_at timestamptz not null default now()
);

create index if not exists product_images_product_order_idx
on public.product_images(product_id, sort_order);

create unique index if not exists product_images_one_cover_idx
on public.product_images(product_id)
where is_cover;

alter table public.product_images enable row level security;

revoke all on public.product_images from anon, authenticated;
grant select on public.product_images to anon, authenticated;
grant insert, update, delete on public.product_images to authenticated;

drop policy if exists "Read active product images" on public.product_images;
create policy "Read active product images"
on public.product_images
for select
to anon, authenticated
using (
  active
  and exists (
    select 1
    from public.products p
    where p.id = product_images.product_id
      and p.active
  )
);

drop policy if exists "Admin product images" on public.product_images;
create policy "Admin product images"
on public.product_images
for all
to authenticated
using ((select public.is_admin()))
with check ((select public.is_admin()));

drop policy if exists "Admin read product image objects" on storage.objects;
create policy "Admin read product image objects"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'product-images'
  and (select public.is_admin())
);

drop policy if exists "Admin upload product image objects" on storage.objects;
create policy "Admin upload product image objects"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'product-images'
  and (select public.is_admin())
);

drop policy if exists "Admin update product image objects" on storage.objects;
create policy "Admin update product image objects"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'product-images'
  and (select public.is_admin())
)
with check (
  bucket_id = 'product-images'
  and (select public.is_admin())
);

drop policy if exists "Admin delete product image objects" on storage.objects;
create policy "Admin delete product image objects"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'product-images'
  and (select public.is_admin())
);

create or replace function public.set_product_image_cover(target_id uuid)
returns void
language plpgsql
security invoker
set search_path=''
as $$
declare
  target_product text;
begin
  if not public.is_admin() then
    raise exception 'Acceso no autorizado' using errcode='42501';
  end if;

  select product_id into target_product
  from public.product_images
  where id = target_id;

  if target_product is null then
    raise exception 'Imagen no encontrada' using errcode='P0002';
  end if;

  update public.product_images
  set is_cover = false
  where product_id = target_product
    and is_cover = true;

  update public.product_images
  set is_cover = true,
      active = true
  where id = target_id;
end;
$$;

revoke all on function public.set_product_image_cover(uuid) from public;
grant execute on function public.set_product_image_cover(uuid) to authenticated;

commit;
