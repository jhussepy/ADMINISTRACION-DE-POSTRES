# Yape para clientes

El enlace privado de cada pedido muestra el saldo acordado, los datos de Yape y un formulario para enviar una captura. El comprobante se guarda en el bucket privado `payment-proofs`; el pago se registra como **pending**. Administración debe verificarlo antes de cambiarlo a **confirmed**. La aplicación no puede comprobar automáticamente una transferencia hecha en Yape.

## Activación

1. Ejecuta `supabase/yape-customer-v1.sql`, `supabase/yape-mp-exclusion-v1.sql`, `supabase/yape-mp-exclusion-v2.sql` y `supabase/manual-payment-guard-v2.sql` en Supabase SQL Editor, en ese orden. La última migración impide crear nuevos pagos pendientes cuando el pedido ya está cubierto, exceder el saldo o registrar dos Yapes pendientes para un mismo pedido. También permite devolver un pago confirmado a pendiente sin contar dos veces su importe. Si las tres primeras ya están instaladas, ejecuta solo la última. `manual-payment-guard-v2.sql` sustituye a `manual-payment-guard-v1.sql` y se puede ejecutar aunque V1 ya esté aplicada.
2. Configura en Vercel para Production y Preview:
   - `YAPE_NUMBER`: número real de nueve dígitos que empieza por 9.
   - `YAPE_HOLDER`: nombre del destinatario que el cliente verá en Yape.
   - `YAPE_QR_URL` (opcional): URL HTTPS de tu QR o una ruta local `/images/archivo.webp`. Confirma que corresponde al mismo número.
   - `SUPABASE_SERVICE_ROLE_KEY`: clave privada existente para operaciones del servidor. Nunca uses prefijo `NEXT_PUBLIC_`.
   - `NEXT_PUBLIC_SITE_URL`: dominio público correcto, para compartir enlaces desde Administración.
3. Despliega de nuevo para que Vercel cargue las variables. En `/admin/pedidos/[id]`, confirma el importe real, copia el enlace privado y compártelo por WhatsApp con el cliente.

No copies datos de prueba a Production. Si faltan el número, el titular, el token de la migración o la clave de servicio, Administración no mostrará un enlace listo para compartir.

El panel **Migraciones en esta base de datos** de `/admin` comprueba directamente las columnas de Pagos V2 y la marca de la última migración. **Disponible** significa que esa comprobación pasó; **Revisar** indica que debes verificar el SQL señalado en Supabase. Los archivos en GitHub por sí solos no actualizan la base de datos.

## Revisión

En la ficha del pedido, la captura aparecerá en **Pagos y comprobantes** como Yape **Pendiente de verificación**. Revisa el movimiento recibido en tu propia cuenta de Yape, coteja importe y número de operación y recién entonces confírmalo. Una captura por sí sola no demuestra que el dinero haya llegado. Puedes rechazarla si no coincide.

Si el pedido ya está cubierto pero existe un pago pendiente anterior a esta migración, la página lo señala. Comprueba primero los movimientos reales y rechaza el registro adicional que no corresponda. La migración no altera ni rechaza pagos históricos automáticamente.

El enlace es una credencial del pedido: compártelo únicamente con ese cliente. No publiques capturas que contengan el enlace. Solo se permite un comprobante Yape pendiente por pedido y hasta cinco envíos por día; la captura se almacena en un bucket privado.

## Evitar cobros simultáneos

Mientras un enlace Mercado Pago está vigente, la página Yape oculta los datos de pago y no admite comprobantes nuevos. Si ya hay un Yape pendiente, Administración no puede generar un enlace Mercado Pago hasta verificar o rechazar ese movimiento. La base de datos aplica la misma regla para peticiones concurrentes. Si la migración detecta un pedido que ya combina ambos canales pendientes, se detiene para que lo concilies antes de continuar.

Un pago iniciado en un proveedor antes del vencimiento podría liquidarse más tarde. Revisa los movimientos reales del proveedor antes de aceptar otro cobro para ese pedido.
