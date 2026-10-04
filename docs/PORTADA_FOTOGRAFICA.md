# Portada fotográfica de Yemape

La referencia visual es el video de Coffee aportado por el usuario. Esta implementación tiene composición, recursos y código propios. No utiliza el código ni los recursos premium de la plantilla.

## Composición

- Portada crema con título editorial, torta y porción en capas, acceso al catálogo y enlace a las instrucciones de compra.
- Categorías en una fila navegable, seguidas de la galería de destacados existente.
- Postre estrella sobre fondo chocolate: fotografía central, información del proceso de compra y selección de presentación.
- Ocasiones, instrucciones, entrega y contacto completan la página.

Se conserva la identidad de Yemape: crema, vino, rosa y chocolate, con Playfair Display y DM Sans. Los estilos nuevos están en `app/home.css` y se limitan a la portada.

## Productos y fotografías

La portada y el postre estrella usan el producto activo `torta-chocolate`, o el primer producto disponible. El nombre, la descripción y la ficha de compra proceden del catálogo.

Las capas recortadas existentes solo se muestran cuando el producto conserva la portada original `/images/torta-chocolate.webp`. Si el administrador sustituye la fotografía, ambas secciones usan esa imagen real. Si no hay productos, la portada conserva el título y el acceso al catálogo; no muestra un producto inexistente.

No se publican precios inventados ni cifras de porciones nuevas. Se mantiene la confirmación de presentación, disponibilidad e importe.

## Movimiento y accesibilidad

Las capas se desplazan a distintas velocidades durante el scroll nativo, sin zoom ni interceptar el desplazamiento. Una oscilación angular suave mantiene la composición viva. Este efecto no es un modelo 3D ni un giro real de 360 grados.

El botón de pausa de la portada controla ambas composiciones. La animación se detiene fuera de pantalla y en pestañas ocultas. Con `prefers-reduced-motion`, las imágenes quedan estáticas y los controles de compra siguen disponibles. El texto se renderiza visible desde el servidor.

Los cambios visuales por scroll usan variables CSS y un frame por evento, sin actualizar el estado de React continuamente. Las fotografías se optimizan con Next.js; solo la fotografía principal se precarga y la sección inferior usa carga diferida. No se añaden librerías de animación.

## Publicación

Hacer merge del PR y esperar el despliegue de Vercel. No requiere migraciones SQL, nuevos permisos ni variables de entorno.

## Verificación

Las pruebas de navegador verifican pausa, movimiento reducido, imágenes cargadas, compra desde ambas secciones, restauración del carrito y cinco anchos de pantalla (375, 700, 768, 1024 y 1440 px). La suite de la tienda también cubre galería WebGL, filtros, favoritos, variantes, checkout invitado y entrega del pedido a WhatsApp.
