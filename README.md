# Yemape · Repostería artesanal

Primera versión de la tienda de **Repostería Yemape**, desarrollada con Next.js, React y TypeScript para desplegar en Vercel.

## Qué está implementado

- Página principal responsive, con identidad propia, portada con el video de la torta enviado por el propietario y fotografías de Yemape optimizadas en WebP.
- Diseño público renovado: cabecera compacta, categorías fotográficas con las portadas actuales del catálogo, postre destacado con fotografía grande, tarjetas sin etiquetas sobre la imagen y botones uniformes. Las entradas suaves al desplazarse respetan movimiento reducido y el contenido permanece visible sin JavaScript.
- Catálogo inicial de once productos, incluidos pies de limón, maracuyá y manzana, y brownie de chocolate, con buscador y categorías.
- Ficha ampliada de cada postre con imagen completa, presentaciones seleccionables y selector de cantidad.
- Catálogo de dos columnas en celulares desde 360 px y acceso fijo al carrito cuando contiene productos.
- Carrito persistente en el navegador: agregar, quitar, cambiar presentaciones y cantidades, y recuperar la selección al volver.
- Compra como invitado, sin registro obligatorio.
- Formulario de pedido: nombre, recojo/delivery, dirección condicional, fecha, ocasión, dedicatoria y observaciones. Si incluye una torta personalizada, solicita número de personas y permite indicar sabor y temática.
- Colecciones por ocasión y condiciones de recojo y delivery con ejemplos marcados como tales.
- Resumen editable antes de abrir WhatsApp; conserva los datos al volver a revisar el carrito.
- Preguntas frecuentes sobre cuentas, confirmación, entrega y pedidos personalizados.
- Revalidación del catálogo en el servidor antes de preparar el enlace a **WhatsApp +51 934 219 749**.
- Autenticación con **Clerk + Google**: acceso sin contraseña propia de Yemape, cierre de sesión y perfil persistente en Supabase con nombre, teléfono y dirección.
- Administración protegida por comprobación de identidad en el servidor y políticas RLS en la base de datos.
- Productos: alta, edición, categoría, orden y visibilidad.
- **Commerce V2:** múltiples presentaciones reales por producto, cada una con precio propio, disponibilidad y orden, administradas desde `/admin/productos`.
- **Galería V3:** carga de fotografías directamente desde Administración mediante Supabase Storage, hasta 8 por producto, con portada, orden, visibilidad y galería pública.
- **Nuevo Producto V4:** alta guiada con precio de porción individual y entero, foto propia desde el primer formulario y sin reutilizar diseños de otros productos.
- **Pedidos V2:** registro automático antes de abrir WhatsApp, código único `YMP-AAAA-0001`, snapshot histórico de productos/precios, vínculo opcional con Clerk, estados operativos y ficha completa en Administración.
- **Dashboard V2:** centro de operaciones con pedidos por atender, producción, entregas de hoy/mañana, cotizaciones y métricas financieras que excluyen pedidos sin precio confirmado.
- **Calendario:** vista mensual de producción y entregas en `/admin/calendario`, con filtros por estado, modalidad y acceso directo a cada pedido.
- **WhatsApp V2:** mensaje estructurado por productos, cliente, entrega y estado; los precios de demostración dejan de mostrarse como importes oficiales.
- **Clientes V1 / CRM:** ficha única por teléfono normalizado, búsqueda, historial de pedidos, productos recurrentes, direcciones utilizadas, modalidad habitual y WhatsApp directo.
- **Notas internas:** contexto privado del cliente visible solo para Administración, protegido por RLS.
- **Timeline de pedido:** auditoría de cambios de estado, cotización, total y adelantos con fecha/hora y actor.
- **Búsqueda de pedidos:** localización rápida por código `YMP`, nombre o teléfono, combinable con filtros existentes.
- **Pagos V2:** registro de Yape, Plin, transferencia, efectivo y otros métodos, con estado, referencia, comprobante privado y saldo derivado solo de pagos confirmados.
- **Centro de pagos:** `/admin/pagos` reúne movimientos, filtros, búsquedas y trazabilidad por pedido.
- **Yape para clientes:** una vez confirmado el total, Administración comparte un enlace privado para que el cliente vea los datos de Yape y envíe su comprobante; el abono queda pendiente hasta la verificación manual. Requiere la migración y configuración de `docs/YAPE_CUSTOMER.md`.
- **PagoKit + Mercado Pago:** arquitectura de checkout alojado, idempotencia, webhook HMAC, reconsulta autoritativa y conciliación transaccional preparada para activarse cuando existan precios oficiales.
- Pedidos manuales: siguen disponibles para teléfono, Instagram o chats externos, usando el mismo flujo de estados y códigos.

**Modo demostrativo:** `lib/demo-catalog.ts` sigue proporcionando tamaños y precios de ejemplo mientras un producto no tenga variantes reales. La tienda puede mostrarlos como referencia de interfaz, pero WhatsApp V2 los convierte en **Precio pendiente de confirmación** y el Dashboard no los cuenta como ventas.

Con **Commerce V2**, las variantes creadas en Supabase tienen prioridad automática sobre esos ejemplos. Puedes migrar un producto a la vez: cuando añades su primera variante real desde Administración, ficha, carrito y WhatsApp empiezan a usar únicamente esas presentaciones reales. Para activar la tabla en una instalación existente ejecuta `supabase/variants-v2.sql` en Supabase SQL Editor.

## Qué funciona sin configurar servicios

El catálogo, el carrito y la solicitud por WhatsApp funcionan sin cuenta y sin base de datos, usando `lib/products.ts`. El acceso a `/cuenta` usa Clerk cuando sus variables están configuradas; la administración nunca se habilita sin una identidad y permiso reales.

Al configurar Supabase, el catálogo pasa a leerse de la base de datos. Ante un fallo de la base de datos se muestra un error; no se sustituye silenciosamente por un catálogo antiguo.

## Publicar desde GitHub y Vercel

No necesitas instalar nada en tu computadora.

1. Integra la rama de este proyecto en `main` desde el pull request.
2. En Vercel, selecciona **Add New → Project** e importa `jhussepy/ADMINISTRACION-DE-POSTRES`.
3. Usa el framework **Next.js**, directorio raíz del repositorio, Node.js **22.x** y los comandos automáticos (`npm install` / `npm run build`). No cambies el directorio de salida.
4. Pulsa **Deploy**. La tienda pública y WhatsApp funcionarán sin añadir variables.
5. Para activar las cuentas y la administración, sigue [la guía de configuración](docs/configuracion.md).

La creación de este código no despliega automáticamente un sitio público ni provisiona una base de datos.

## Desarrollo y comprobaciones

```bash
npm ci
npm run dev
npm run test
npm run typecheck
npm run build
```

Las pruebas unitarias cubren carrito inválido, cantidades máximas, productos retirados, cálculos en céntimos, fechas reales/zona horaria de Lima, dirección condicional y codificación del mensaje de WhatsApp.

La prueba de navegador está en `tests/storefront.spec.ts` y se ejecuta con `npm run test:e2e` después de `npm run build` y `npx playwright install chromium`. Utiliza el catálogo inicial sin variables de Supabase; **no envía mensajes** ni realiza compras.

## Estructura

- `app/`: rutas, acciones de servidor y estilos.
- `components/`: tienda, formularios de cuenta y administración.
- `lib/cart.ts`: cantidades, totales, fechas y mensaje de WhatsApp.
- `lib/products.ts`: catálogo inicial y diseños disponibles.
- `lib/demo-catalog.ts`: valores de muestra reemplazables por los reales.
- `lib/supabase/`: cliente Supabase de servidor que inyecta el token de sesión de Clerk.
- `supabase/schema.sql`: esquema base de productos, perfiles, pedidos, administración y datos iniciales.
- `supabase/variants-v2.sql`: activa Commerce V2 con presentaciones y precios reales.
- `supabase/clerk-auth.sql`: migra perfiles y autorización a Clerk.
- `supabase/product-images-v3.sql`: crea el bucket y la galería segura de imágenes administrables.
- `supabase/new-product-v4.sql`: permite el placeholder neutro y futuras imágenes locales sin mantener una lista rígida en la base de datos.
- `supabase/orders-v2.sql`: activa códigos públicos, snapshot histórico, estados V2 y creación automática segura de solicitudes web.
- `supabase/customers-v1.sql`: activa CRM de clientes, deduplicación por teléfono, notas internas y timeline auditado de pedidos.
- `supabase/payments-v2.sql`: activa movimientos de pago, comprobantes privados, conciliación de saldo y webhook transaccional de Mercado Pago.
- `supabase/payments-v2-hardening.sql`: ejecutar después de Pagos V2 y **antes** de desplegar esta versión; limita los enlaces nuevos de Mercado Pago a 30 minutos y bloquea confirmaciones manuales durante su vigencia.
- `supabase/yape-customer-v1.sql`: crea el token privado de pago de cada pedido y limita los comprobantes pendientes del cliente.
- `supabase/yape-mp-exclusion-v1.sql`: impide usar Yape y un enlace Mercado Pago vigente en el mismo pedido, incluso con solicitudes concurrentes.
- `supabase/yape-mp-exclusion-v2.sql`: mantiene la exclusión sin bloquear avisos repetidos de Mercado Pago para pagos ya pendientes.
- `docs/PAGOKIT_INTEGRATION.md`: arquitectura de seguridad adaptada de PagoKit y checklist de activación.
- `docs/PORTADA_VIDEO.md`: video, reproducción, rendimiento y verificación de la portada.
- `docs/`: configuración, alcance y notas de verificación.

## Límites de esta primera versión

- Abrir WhatsApp no envía el mensaje por sí solo, no cobra y no confirma una compra. Con Pedidos V2, la solicitud ya queda registrada antes de abrir el chat; el negocio aún debe confirmar disponibilidad, precio final y entrega.
- El carrito no se borra al abrir WhatsApp. Se conserva en ese navegador; no se sincroniza entre dispositivos.
- Pedidos V2 registra la solicitud de la web automáticamente; conversaciones o pedidos que nazcan directamente fuera de la web todavía se registran manualmente.
- Cuentas y administración requieren Clerk, Supabase, la migración `supabase/clerk-auth.sql` y un Clerk User ID autorizado como administrador.
- Las fotografías iniciales siguen sirviendo como respaldo. Tras activar Galería V3, las nuevas imágenes pueden administrarse desde el panel sin modificar GitHub.
- El CRM no calcula gasto histórico del cliente mientras existan pedidos con precios demo o por cotizar; evita mostrar cifras comerciales falsas.
- Mercado Pago permanece preparado pero no debe activarse con precios demo; el pedido exige cotización real antes de generar un enlace. Los enlaces nuevos duran 30 minutos. Un enlace antiguo sin vencimiento impide confirmar pagos manuales hasta que se inhabilite en Mercado Pago y se concilie su registro local. Los pagos iniciados antes de vencer pueden liquidarse después; revisa la cuenta del proveedor y cualquier evento rechazado antes de registrar otro cobro.
- Pagos V2 registra cobros y saldos, pero no equivale a contabilidad ni utilidad empresarial.
- Inventario de ingredientes, costos de recetas, egresos y reportes completos corresponden a una siguiente etapa; el saldo por cobrar no equivale a ganancia.
- Antes de abrir ventas, el propietario debe confirmar precios, presentaciones, catálogo, horarios, recojo y condiciones de delivery.
- Cada postre cuenta actualmente con una foto; las galerías con distintos ángulos requieren fotos adicionales.

Referencia de estructura aportada por el propietario: María Almenara. No se han reutilizado sus imágenes, textos ni logotipos.

## Capturas de la versión verificada

[Categorías fotográficas](docs/editorial-categories.webp) · [Postre destacado](docs/editorial-spotlight.webp) · [Catálogo](docs/editorial-catalog.webp) · [Portada en celular](docs/editorial-mobile.webp) · [Ficha de producto](docs/preview-product.webp)


## Fichas y carrito

La ficha y la vista rápida comparten una galería de fotos reales: miniaturas, cambio de foto y vista ampliada con acercamiento. Las fotos inactivas no se muestran. Si el producto tiene una sola foto, se presenta esa foto sin inventar ángulos adicionales. Las fotos adicionales se cargan desde la galería del panel existente.

En celular, la ficha conserva un acceso a agregar la presentación y cantidad elegidas; el carrito aparece como una pantalla completa. En computadora, el carrito abre a la derecha y mantiene el resumen separado de los productos que se desplazan. El formulario sigue permitiendo pedir como invitado o con cuenta.

[Ficha en computadora](docs/product-experience-desktop.webp) · [Galería ampliada](docs/product-experience-gallery.webp) · [Presentaciones en celular](docs/product-experience-options.webp) · [Carrito lateral](docs/product-experience-cart.webp) · [Carrito en celular](docs/product-experience-cart-mobile.webp) · [Vista rápida](docs/product-experience-quick-view.webp)

Esta mejora gráfica no requiere ejecutar SQL ni cambiar variables de entorno.
