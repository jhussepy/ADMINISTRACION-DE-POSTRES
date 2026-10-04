# Seguimiento de pedidos

## Activación

Después del merge, ejecuta `supabase/order-tracking-v1.sql` en Supabase SQL Editor. La migración añade una clave privada diferente para cada pedido existente y futuro. No cambia estados ni pagos. La página de pedidos en Administración avisa mientras falte esa columna.

El servidor necesita `SUPABASE_SERVICE_ROLE_KEY` en Vercel para consultar un pedido por su clave privada. La clave nunca se envía al navegador. `NEXT_PUBLIC_SITE_URL` debe apuntar al dominio público correcto.

## Uso diario

1. Los pedidos del carrito se registran como **Nuevo**. Su mensaje inicial de WhatsApp incluye el enlace de seguimiento cuando la migración está activa. Un pedido manual se crea como **Por confirmar**.
2. En Administración → Pedidos, usa el botón de avance para pasar a la siguiente etapa. Para cambiar un estado excepcional, el precio o la cotización, abre **Ver pedido completo**.
3. Después de actualizarlo, pulsa **Avisar por WhatsApp**. Se abre un mensaje preparado con el estado y el enlace; revísalo y envíalo tú. El sistema no envía mensajes automáticamente.
4. El cliente puede abrir el enlace cuando quiera, con cuenta o sin ella. Verá el estado, las etapas y la fecha solicitada. No verá su teléfono, dirección ni notas privadas.

El estado **Confirmado** significa que el pedido fue aceptado; la confirmación de un pago se gestiona por separado en Pagos. **Cotización pendiente** es una condición del precio, no una etapa de preparación.

Trata el enlace de seguimiento como privado: quien lo tenga podrá consultar el estado. Compártelo solo con ese cliente.
