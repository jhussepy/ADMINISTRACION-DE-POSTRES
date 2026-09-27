# Yemape · Repostería artesanal

Primera versión de la tienda de **Repostería Yemape**, desarrollada con Next.js, React y TypeScript para desplegar en Vercel.

## Qué está implementado

- Página principal responsive, con identidad propia y diseños de Yemape optimizados en WebP.
- Catálogo inicial de cuatro productos, buscador con limpieza rápida y categorías.
- Ficha ampliada de cada postre con imagen completa, presentación y selector de cantidad.
- Catálogo de dos columnas en celulares desde 360 px y acceso fijo al carrito cuando contiene productos.
- Carrito persistente en el navegador: agregar, quitar, cambiar cantidades y recuperar la selección al volver.
- Compra como invitado, sin registro obligatorio.
- Formulario de pedido: nombre, recojo/delivery, dirección condicional, fecha y observaciones.
- Resumen editable antes de abrir WhatsApp; conserva los datos al volver a revisar el carrito.
- Preguntas frecuentes sobre cuentas, confirmación, entrega y pedidos personalizados.
- Revalidación del catálogo en el servidor antes de preparar el enlace a **WhatsApp +51 934 219 749**.
- Autenticación opcional con Supabase: registro, confirmación de correo, inicio/cierre de sesión, recuperación/cambio de contraseña y perfil con nombre, teléfono y dirección.
- Administración protegida por comprobación de identidad en el servidor y políticas RLS en la base de datos.
- Productos: alta, edición, presentación, precio, categoría, orden y visibilidad.
- Pedidos: registro manual, fecha de entrega, total, importe abonado y estados. Resumen de productos visibles, pedidos por atender y saldo por cobrar.

**Los productos iniciales tienen precio por consultar.** No se han inventado precios ni medidas comerciales. Cada presentación puede registrarse como una entrada independiente en el catálogo.

## Qué funciona sin configurar servicios

El catálogo, el carrito y la solicitud por WhatsApp funcionan sin cuenta y sin base de datos, usando `lib/products.ts`. Al no existir configuración de Supabase, `/cuenta` informa que las cuentas aún no están habilitadas. No simula una sesión ni permite entrar a la administración.

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
- `lib/supabase/`: cliente de servidor con cookies.
- `supabase/schema.sql`: tablas, restricciones, permisos y datos iniciales.
- `docs/`: configuración, alcance y notas de verificación.

## Límites de esta primera versión

- Abrir WhatsApp no envía el mensaje por sí solo, no cobra y no confirma una compra. El cliente debe enviarlo; el negocio debe acordar disponibilidad, precio y entrega.
- El carrito no se borra al abrir WhatsApp. Se conserva en ese navegador; no se sincroniza entre dispositivos.
- Los mensajes de WhatsApp no se importan automáticamente: los pedidos se registran en el panel después de coordinarlos.
- Cuentas y administración requieren un proyecto Supabase configurado, migración SQL y un usuario administrador verificado.
- Se incluyen cuatro diseños existentes; la carga de nuevas imágenes desde el panel no forma parte de esta versión.
- Inventario de ingredientes, costos de recetas, egresos y reportes completos corresponden a una siguiente etapa; el saldo por cobrar no equivale a ganancia.
- Antes de abrir ventas, el propietario debe confirmar precios, presentaciones, catálogo, horarios, recojo y condiciones de delivery.

Referencia de estructura aportada por el propietario: María Almenara. No se han reutilizado sus imágenes, textos ni logotipos.

## Capturas de la versión verificada

[Vista de computadora](docs/preview-desktop.webp) · [Vista de celular](docs/preview-mobile.webp) · [Ficha de producto](docs/preview-product.webp)
