# Yemape · Repostería artesanal

Primera versión de la tienda de **Repostería Yemape**, desarrollada con Next.js, React y TypeScript para desplegar en Vercel.

## Qué está implementado

- Página principal responsive, con identidad propia, portada fotográfica y fotografías de Yemape optimizadas en WebP.
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
- Pedidos: registro manual, fecha de entrega, total, importe abonado y estados. Resumen de productos visibles, pedidos por atender y saldo por cobrar.

**Modo demostrativo:** `lib/demo-catalog.ts` sigue proporcionando tamaños y precios de ejemplo mientras un producto no tenga variantes reales. La web y el mensaje de WhatsApp los marcan expresamente como ejemplos.

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
- `supabase/variants-v2.sql`: activa Commerce V2 con presentaciones y precios reales. En una instalación nueva, ejecútalo inmediatamente después de `schema.sql`.
- `docs/`: configuración, alcance y notas de verificación.

## Límites de esta primera versión

- Abrir WhatsApp no envía el mensaje por sí solo, no cobra y no confirma una compra. El cliente debe enviarlo; el negocio debe acordar disponibilidad, precio y entrega.
- El carrito no se borra al abrir WhatsApp. Se conserva en ese navegador; no se sincroniza entre dispositivos.
- Los mensajes de WhatsApp no se importan automáticamente: los pedidos se registran en el panel después de coordinarlos.
- Cuentas y administración requieren Clerk, Supabase, la migración `supabase/clerk-auth.sql` y un Clerk User ID autorizado como administrador.
- Se incluyen fotografías y diseños de once productos; la carga de nuevas imágenes desde el panel no forma parte de esta versión.
- Inventario de ingredientes, costos de recetas, egresos y reportes completos corresponden a una siguiente etapa; el saldo por cobrar no equivale a ganancia.
- Antes de abrir ventas, el propietario debe confirmar precios, presentaciones, catálogo, horarios, recojo y condiciones de delivery.
- Cada postre cuenta actualmente con una foto; las galerías con distintos ángulos requieren fotos adicionales.

Referencia de estructura aportada por el propietario: María Almenara. No se han reutilizado sus imágenes, textos ni logotipos.

## Capturas de la versión verificada

[Vista de computadora](docs/preview-desktop.webp) · [Vista de celular](docs/preview-mobile.webp) · [Ficha de producto](docs/preview-product.webp)
