# Activar Clerk + Google y Supabase en Vercel

La tienda pública y el carrito funcionan sin iniciar sesión. **Clerk** gestiona la identidad con Google y **Supabase** conserva catálogo, perfiles, pedidos, variantes y autorización RLS.

## 1. Base de datos

1. En Supabase crea el proyecto de Yemape.
2. En **SQL Editor**, ejecuta `supabase/schema.sql`.
3. Ejecuta `supabase/variants-v2.sql` para activar Commerce V2.
4. No uses `service_role`, secret keys ni la contraseña de la base de datos en el frontend.

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
- sin sesión, confirma que `profiles`, `admins` y `orders` no exponen datos.

## Cambiar o añadir imágenes

Los diseños actuales están en `public/images/`. Para incorporar otra fotografía, añade el archivo optimizado, su ruta a `productImages` en `lib/products.ts` y actualiza la restricción `products_image_check` de Supabase. La carga directa de fotografías desde Administración es una mejora futura.
