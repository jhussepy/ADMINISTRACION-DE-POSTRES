-- Nuevo Producto V4 · elimina la dependencia de una lista fija de imágenes.
-- Ejecutar una sola vez después de product-images-v3.sql.
begin;

alter table public.products
  drop constraint if exists products_image_check;

alter table public.products
  add constraint products_image_check
  check (
    char_length(image) between 1 and 200
    and image ~ '^/images/[A-Za-z0-9][A-Za-z0-9._-]*$'
  );

commit;
