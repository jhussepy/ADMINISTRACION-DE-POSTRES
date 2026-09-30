# Activar Clerk + Google y Supabase en Vercel

La tienda pública y el carrito funcionan sin iniciar sesión. **Clerk** gestiona la identidad con Google y **Supabase** conserva catálogo, perfiles, pedidos, variantes y autorización RLS.

## 1. Base de datos

1. En Supabase crea el proyecto de Yemape.
2. En **SQL Editor**, ejecuta `supabase/schema.sql`.
3. Ejecuta `supabase/variants-v2.sql` para activar Commerce V2.
4. Si ya migraste la autenticación a Clerk, ejecuta `supabase/clerk-auth.sql`.
5. Para activar fotografías administrables, ejecuta `supabase/product-images-v3.sql` una sola vez. Crea un bucket público solo para lectura de imágenes de catálogo; las escrituras siguen limitadas al administrador mediante RLS.
6. Ejecuta `supabase/new-product-v4.sql` una sola vez para activar el nuevo flujo de alta de productos con foto propia y placeholder neutro.
7. Ejecuta `supabase/orders-v2.sql` una sola vez para activar pedidos automáticos, códigos `YMP-...`, snapshot histórico y estados V2.
8. No uses `service_role`, secret keys ni la contraseña de la base de datos en el frontend.

## 2. Clerk con Google

1. Crea la aplicación de Yemape en Clerk.
2. En **Configure → SSO connections**, activa **Google OAuth** para sign-up y sign-in.
3. En desarrollo puedes usar las credenciales compartidas de Clerk. Para producción configura las credenciales de Google que Clerk solicite.
4. En Clerk activa la integración con Supabase.
5. En Supabase abre **Authentication → Sign In / Providers → Third-Party Auth**, añade **Clerk** y usa el dominio de tu instancia Clerk.

No hace falta configurar Email/Password en Supabase Auth ni crear JWT Templates antiguos.

## 3. Variables de Vercel

En **Vercel → Settings → Environment Variables**, configura en Production:

| Variable | Uso |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | URL pública del proyecto Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Publishable/anon key de Supabase |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Publishable key de Clerk |
| `CLERK_SECRET_KEY` | Secret key de Clerk; debe permanecer privada |
| `NEXT_PUBLIC_SITE_URL` | URL pública de Yemape, sin barra final |

Después de guardar cambios haz un nuevo despliegue.

## 4. Migrar RLS de Supabase Auth a Clerk

Como la base original se creó para IDs UUID de Supabase Auth, ejecuta **una sola vez** en Supabase SQL Editor:

`supabase/clerk-auth.sql`

La migración:

- convierte `profiles.id` y `admins.user_id` a texto para aceptar IDs de Clerk `user_...`;
- elimina las antiguas referencias a `auth.users`;
- actualiza RLS para comparar contra `auth.jwt()->>'sub'`;
- conserva `is_admin()` para proteger productos, variantes y pedidos.

No vuelvas a ejecutar `schema.sql` después de esta migración sobre una base ya configurada.

## 5. Primer acceso y administrador

1. Después del despliegue abre `/cuenta`.
2. Pulsa **Continuar con Google** y entra con la cuenta Google que será administradora.
3. En **Clerk Dashboard → Users**, abre ese usuario y copia su **User ID**. Tiene formato `user_...`.
4. En Supabase SQL Editor ejecuta:

```sql
insert into public.admins(user_id)
values ('user_REEMPLAZAR')
on conflict do nothing;
```

5. Recarga `/cuenta`. Debe aparecer **Ir a la administración →**.
6. Abre `/admin`.

El correo no se usa como permiso en la base de datos. El permiso administrativo queda asociado al User ID verificado de Clerk.

Para retirar el acceso:

```sql
delete from public.admins
where user_id='user_REEMPLAZAR';
```

## 6. Verificación

Antes de abrirlo a clientes:

- comprueba acceso y cierre de sesión con Google;
- guarda nombre, teléfono y dirección y recarga `/cuenta`;
- confirma que un usuario normal no puede abrir `/admin`;
- confirma que el administrador sí puede editar productos, variantes y pedidos;
- crea dos variantes reales y comprueba ficha, carrito y WhatsApp;
- desactiva una variante y verifica que deja de estar disponible;
- sube una fotografía desde `/admin/productos`, conviértela en portada y verifica que sustituye la imagen anterior en catálogo y ficha;
- sube una segunda fotografía y comprueba que aparece como miniatura navegable en la ficha;
- oculta una fotografía y comprueba que desaparece para clientes sin eliminarla del panel;
- finaliza un carrito como invitado: antes de abrir WhatsApp debe crearse una solicitud con código `YMP-...` en `/admin/pedidos`;
- repite el botón/reintento del mismo checkout y confirma que no se duplica el pedido;
- verifica que el mensaje de WhatsApp incluya el código del pedido y el teléfono;
- cambia después el precio de un producto y confirma que la ficha del pedido anterior conserva su precio histórico;
- confirma que un pedido con producto por cotizar aparece marcado como **Requiere cotización**;
- sin sesión, confirma que `profiles`, `admins`, `orders` y `order_items` no exponen datos mediante lecturas directas.

## Cambiar o añadir imágenes

Las fotografías iniciales permanecen en `public/images/` como respaldo. Con Galería V3 activa, abre `/admin/productos`, edita un producto y usa **Galería de fotografías** para subir JPG, PNG o WebP de hasta 5 MB, elegir portada, ordenar, ocultar o eliminar.


## Crear un producto nuevo

En `/admin/productos`, el formulario **Nuevo producto** ya no pide escoger el diseño de otro producto.

1. Escribe nombre, descripción y categoría.
2. Activa **Porción individual**, **Entero** o ambas.
3. Escribe un precio para cada presentación, o déjalo vacío para cotizar.
4. Puedes subir la foto principal en el mismo formulario.
5. Al crear el producto, la aplicación abre automáticamente su edición.
6. Desde allí puedes añadir más presentaciones como mediana, grande o caja, y gestionar hasta 8 fotografías.

Si no subes foto al crear el producto, se usa temporalmente un placeholder neutro de Yemape hasta que añadas la fotografía real.


## Pedidos V2 automáticos

El checkout no confía en precios enviados por el navegador. Al finalizar:

1. El servidor vuelve a normalizar el carrito.
2. Supabase valida producto, presentación y disponibilidad.
3. La función `create_checkout_order_v2` recalcula precios reales desde `products` / `product_variants`.
4. Se crea un código como `YMP-2026-0001`.
5. `order_items` guarda una copia histórica de nombre, presentación, cantidad y precio.
6. Si existe una sesión Clerk, el pedido guarda el `customer_user_id`; como invitado queda nulo.
7. Recién entonces se genera el enlace de WhatsApp con el código del pedido.

La columna `checkout_key` es única y evita duplicados cuando el cliente toca dos veces o reintenta la misma solicitud.

Los productos que todavía no tienen precio real se registran como **por cotizar**; Pedidos V2 nunca utiliza un precio ficticio del navegador como importe oficial.
