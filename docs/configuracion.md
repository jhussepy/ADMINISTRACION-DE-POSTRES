# Activar cuentas y administración en Vercel

La tienda pública y el carrito ya funcionan sin esta configuración. Supabase aporta la autenticación y los datos persistentes.

## 1. Crear la base de datos

1. En tu cuenta de Supabase, crea un proyecto para Yemape.
2. Abre **SQL Editor**.
3. Ejecuta primero `supabase/schema.sql`. Crea `products`, `profiles`, `orders` y `admins`, activa RLS, restringe los permisos y añade los once productos iniciales sin precios.
4. Después ejecuta `supabase/variants-v2.sql`. Este segundo script crea `product_variants` y activa Commerce V2. Este orden sirve tanto para un proyecto nuevo como para una instalación existente que aún no tenga variantes.
5. Guarda la contraseña de la base de datos en tu gestor de contraseñas. No la necesitas en el frontend ni en el repositorio.

## 2. Configurar Vercel

En el proyecto de Vercel, **Settings → Environment Variables**, añade:

| Variable                        | Valor                                                                                     |
| ------------------------------- | ----------------------------------------------------------------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`      | URL de tu proyecto Supabase                                                               |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Clave pública publishable o anon del mismo proyecto                                       |
| `NEXT_PUBLIC_SITE_URL`          | URL definitiva de tu tienda, por ejemplo `https://tu-dominio.vercel.app`, sin barra final |

Usa solo la clave pública. **Nunca uses `service_role`, secret key ni la contraseña de la base de datos como variables `NEXT_PUBLIC_*`.**

Aplica las variables a Production. Para probar en Preview, usa un proyecto Supabase de pruebas y una URL de preview permitida. Tras guardar las variables, realiza un nuevo despliegue en Vercel.

## 3. Activar correo y enlaces

En Supabase, **Authentication**:

- Activa Email/Password y la confirmación del correo.
- En **URL Configuration**, establece Site URL con la URL pública de Vercel.
- Añade como Redirect URLs `https://TU_DOMINIO/auth/callback` y `https://TU_DOMINIO/auth/callback?next=/cuenta/clave`.
- Configura un proveedor SMTP propio antes de abrir registros a clientes; el servicio de correo de desarrollo de Supabase puede tener restricciones.
- Las plantillas predeterminadas con `{{ .ConfirmationURL }}` funcionan con el callback PKCE. El registro y recuperación deben iniciarse y completarse en el mismo navegador.
- Para confirmación de registro entre navegadores, se incluye `/auth/confirm`: la plantilla de confirmación puede usar `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email`; la de recuperación, `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=recovery`.

## 4. Darte acceso como administrador

1. Crea tu cuenta en `/cuenta` y confirma el correo.
2. En Supabase SQL Editor, ejecuta este bloque reemplazando el correo por el tuyo:

```sql
insert into public.admins(user_id)
select id from auth.users
where lower(email)=lower('TU_CORREO_VERIFICADO')
  and email_confirmed_at is not null
on conflict do nothing;
```

3. Comprueba que se insertó exactamente la cuenta deseada. Un cliente no puede asignarse este permiso desde el sitio.
4. Inicia sesión y abre `/admin`. Desde **Productos**, edita el producto y añade sus presentaciones reales (por ejemplo Porción, Entero, Mediana o Grande), con precio, orden y disponibilidad independientes. Desde **Pedidos**, registra lo coordinado por WhatsApp.

Para retirar acceso administrativo:

```sql
delete from public.admins
where user_id in (select id from auth.users where lower(email)=lower('CORREO_A_RETIRAR'));
```

## 5. Verificación de la integración

Antes de abrir registros reales:

- Crear una cuenta, recibir y usar el correo de confirmación.
- Iniciar sesión, guardar perfil, volver al carrito y confirmar que se precargan nombre/dirección.
- Cerrar sesión y comprobar que el carrito se conserva, pero los datos de perfil ya no se muestran.
- Probar recuperación y cambio de contraseña.
- Comprobar que `/admin` redirige a invitados y devuelve página no encontrada a clientes no administradores.
- Con la clave pública y sin sesión, comprobar que las consultas a `orders`, `profiles` y `admins` no exponen datos y que las escrituras no están permitidas.
- Con una sesión de cliente, comprobar que solo puede leer/editar su propio perfil; no puede acceder a pedidos ni mutar productos ni darse rol de administrador.
- Con la cuenta administradora, crear al menos dos variantes reales de un producto y comprobar que aparecen en su ficha, que pueden elegirse en el carrito y que el mensaje preparado por WhatsApp conserva la presentación y el precio correctos.
- Desactivar una variante y comprobar que deja de estar disponible para clientes sin eliminar las demás.

No se ha conectado un proyecto Supabase real durante la creación inicial del código. Estas comprobaciones requieren tus variables y correos de prueba. No pegues claves privadas en el chat ni en GitHub.

## Cambiar o añadir imágenes

Los diseños actuales están en `public/images/`. Para incorporar otra fotografía, añade el archivo optimizado, su ruta a `productImages` en `lib/products.ts` y actualiza la restricción `products_image_check` de Supabase para permitirla. Esto evita que el panel acepte enlaces arbitrarios. La carga directa de fotos desde el panel es una mejora futura.
