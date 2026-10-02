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
8. Ejecuta `supabase/customers-v1.sql` una sola vez para activar Clientes V1, notas internas y timeline auditado.
9. No uses `service_role`, secret keys ni la contraseña de la base de datos en el frontend.

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


## Dashboard V2, calendario y WhatsApp V2

Esta etapa no requiere una migración SQL adicional después de `orders-v2.sql`.

- `/admin` muestra el centro de operaciones: atención pendiente, producción, entregas, cotizaciones e importes confirmados.
- Los pedidos **Nuevo**, **Por confirmar** o con `quote_required=true` no se contabilizan como ventas confirmadas.
- `/admin/calendario` organiza pedidos operativos por fecha de entrega y permite navegar por meses y estados.
- El filtro **Cotización pendiente** en Pedidos abre directamente las solicitudes que todavía necesitan precio.
- WhatsApp no muestra importes de `demo-catalog.ts` como si fueran precios oficiales. En su lugar usa **Precio pendiente de confirmación**.
- Cuando una presentación tiene precio real, WhatsApp sí muestra ese importe y el pedido puede entrar en métricas financieras después de ser confirmado.

Para verificar esta etapa:

1. Crea una solicitud con un producto que todavía use precios demo y confirma que WhatsApp diga **Precio pendiente de confirmación**.
2. Comprueba que el pedido aparezca como cotización pendiente y no incremente **Importe acordado**.
3. Cambia el pedido a **Confirmado** únicamente después de definir su total real; entonces debe aparecer en las métricas.
4. Abre `/admin/calendario` y confirma que el pedido aparezca en la fecha solicitada.
5. Navega al mes anterior/siguiente y prueba los filtros de estado.


## Clientes V1 y timeline auditado

Después del merge de esta etapa ejecuta **solo**:

`supabase/customers-v1.sql`

La migración:

- crea una ficha CRM única por teléfono normalizado;
- considera equivalentes números peruanos como `970 769 587`, `+51 970 769 587` y `0051 970 769 587`;
- vincula automáticamente los pedidos existentes con su cliente correspondiente;
- conserva todos los pedidos, códigos `YMP`, importes y fechas actuales;
- añade `customer_id` a los pedidos para navegación directa pedido ↔ cliente;
- crea notas internas protegidas por RLS;
- registra cambios futuros de estado, cotización, total y adelanto en `order_events`;
- registra el actor como Administrador, Cliente o Sistema según el contexto.

No se reconstruye un historial ficticio para cambios ocurridos antes de esta migración. La ficha de pedido siempre muestra su fecha real de creación y el timeline avanzado empieza a registrar los cambios posteriores a la activación.

### Verificación de Clientes V1

1. Abre `/admin/clientes` y confirma que los pedidos existentes se hayan agrupado por teléfono.
2. Busca un cliente por nombre y luego por teléfono.
3. Abre su ficha y comprueba historial, productos y direcciones.
4. Guarda una nota interna, recarga y confirma que persiste.
5. Abre uno de sus pedidos y confirma que aparezca **Ver ficha del cliente**.
6. Cambia el estado del pedido, por ejemplo de **Nuevo** a **Por confirmar**.
7. Recarga la ficha del pedido y confirma que el timeline registre el cambio con fecha/hora.
8. Modifica un adelanto y confirma que aparezca un evento de pago.
9. Si resuelves una cotización, comprueba que el timeline guarde el total acordado.
10. Verifica que un usuario no administrador no pueda leer `customers`, `customer_notes` ni `order_events` directamente.

Las notas internas jamás forman parte del mensaje de WhatsApp ni de la tienda pública.
