# PagoKit en Repostería Yemape

Esta integración adapta principios de seguridad y arquitectura de
[PagoKit](https://github.com/Hainrixz/agente-pagokit) al stack real de Yemape:
Next.js App Router, Supabase, Clerk y Vercel.

Referencia analizada: repositorio público `Hainrixz/agente-pagokit`, licencia MIT.

## Qué incorporamos

No copiamos el plugin completo dentro de la aplicación. PagoKit es una herramienta local para
Claude Code; desplegar sus ~45 MB junto con Yemape no aporta funcionalidad a Vercel.

Sí incorporamos sus garantías relevantes:

- precio e importe calculados en servidor;
- idempotencia persistida para crear intentos de cobro;
- checkout alojado para que los datos de tarjeta no pasen por Yemape;
- webhook con límite de cuerpo de 256 KB;
- verificación HMAC en tiempo constante;
- ventana máxima de 300 segundos para la firma de Mercado Pago;
- deduplicación de eventos;
- reconsulta autoritativa de cada pago al API del proveedor;
- conciliación transaccional en PostgreSQL;
- logs con identificadores/estado técnico, nunca payloads con PII;
- secretos solo en variables de entorno de Vercel;
- comprobantes en bucket privado con URL firmada temporal;
- pruebas de firma válida, firma falsa, payload manipulado y replay temporal.

## Decisión para Perú

PagoKit marca **Mercado Pago** como integración `build` para Perú y PEN, con checkout alojado,
idempotencia y esquema de webhook verificado.

PagoKit conoce **Culqi** y su soporte de Yape, pero lo mantiene en nivel `advise` porque el
esquema de autenticación del webhook no está suficientemente verificado en su catálogo.
Yemape no inventa un verificador para Culqi.

Por eso:

1. Yape, Plin, transferencia y efectivo funcionan desde Pagos V2 como métodos operativos
   registrados por Administración.
2. Mercado Pago queda preparado como primer PSP online.
3. Culqi/Yape API puede añadirse más adelante cuando su contrato de webhook esté validado con
   documentación oficial actual.

## Flujo Mercado Pago

1. Administración confirma el total real del pedido.
2. Yemape calcula el saldo pendiente en el servidor.
3. Se crea primero un registro local `payments` con UUID e idempotency key.
4. El servidor crea una preferencia de Checkout Pro.
5. El cliente paga en la página alojada del proveedor.
6. La página de retorno de Yemape **no** declara éxito.
7. El webhook verifica `x-signature`.
8. Yemape reconsulta `GET /v1/payments/{id}`.
9. Solo la respuesta autenticada del API se usa para importe, moneda y estado.
10. PostgreSQL deduplica el evento y actualiza el pago en una misma operación.
11. El trigger recalcula `orders.deposit_cents` usando únicamente pagos confirmados.

### Firma de Mercado Pago

La familia usada por PagoKit es `hmac_field_concat`.

La cadena firmada es:

```text
id:<data.id>;request-id:<x-request-id>;ts:<ts>;
```

El HMAC es SHA-256 con `MP_WEBHOOK_SECRET`.

Importante: esa firma no cubre todo el JSON. Por eso el código jamás confía en
`body.status`, `body.transaction_amount` ni datos del pagador; reconsulta el pago.

## Variables privadas

Las siguientes variables se guardan únicamente en Vercel:

- `MP_ACCESS_TOKEN`
- `MP_WEBHOOK_SECRET`
- `SUPABASE_SERVICE_ROLE_KEY`

`SUPABASE_SERVICE_ROLE_KEY` se usa exclusivamente en el endpoint de webhook para ejecutar la
conciliación de proveedor. Nunca tiene prefijo `NEXT_PUBLIC_`, nunca llega al navegador y
nunca se registra en logs.

## Cuándo activar Mercado Pago

No lo actives todavía si Yemape sigue usando precios demo. El botón permanece preparado, pero la
aplicación exige que el pedido tenga cotización final confirmada antes de generar un enlace.

Cuando existan precios oficiales:

1. crea/activa la cuenta de Mercado Pago del negocio;
2. configura credenciales de prueba primero;
3. registra la URL pública:
   `/api/payments/mercadopago/webhook`;
4. guarda el secreto de webhook en Vercel;
5. añade `SUPABASE_SERVICE_ROLE_KEY` solo a entornos servidor;
6. prueba pago aprobado, rechazado, webhook duplicado y timestamp vencido;
7. recién después cambia a credenciales de producción.

## Alcance PCI

Yemape no renderiza inputs de tarjeta ni recibe PAN/CVV. El checkout online se realiza en el
proveedor alojado. Nunca agregues campos de tarjeta a formularios de Yemape ni los guardes en
Supabase.

## Archivos principales

- `supabase/payments-v2.sql`
- `lib/payments.ts`
- `lib/payments/mercadopago.ts`
- `lib/payments/mercadopago-verify.ts`
- `lib/supabase/service.ts`
- `app/api/payments/mercadopago/webhook/route.ts`
- `app/admin/pagos/page.tsx`
- `tests/payments.test.ts`

Consulta `docs/THIRD_PARTY_NOTICES.md` para el aviso de licencia.
