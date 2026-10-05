# Portada con el video de la torta

La portada usa el archivo `Cinematic_3D_render_of_a_20261003141147.mp4` enviado por el propietario. Conserva la apariencia de la torta, su relleno, cobertura, frutas y el movimiento de cámara del clip. El modelo ilustrativo anterior, su renderer, Three.js y los scripts de Blender se retiraron.

El archivo es una película con acercamiento de cámara. No contiene una vuelta completa ni geometría que permita arrastrar el postre o verlo desde ángulos nuevos. Para un visor 360° fiel al producto se necesita una captura completa desde todos los ángulos o un modelo 3D con materiales y geometría adecuados.

## Archivos y reproducción

- MP4 H.264 para navegadores compatibles, WebM VP9 para los demás. La selección usa las capacidades reales del reproductor.
- Escritorio: 1280 × 720; móvil hasta 700 px: 768 × 432. Solo se solicita una versión por visita. El video móvil pesa aproximadamente 1,4–1,7 MB y el de escritorio 2,8–4,2 MB, según formato.
- Se mantiene el encuadre original de 16:9 sin recortar la torta ni animar el tamaño del contenedor.
- El clip de ocho segundos recorre su movimiento hacia delante y hacia atrás, formando un bucle de dieciséis segundos sin salto al plano inicial. No se agregaron objetos ni se regeneró la torta.
- El audio se retiró: la portada reproduce una pieza visual silenciosa con controles accesibles. La descripción del movimiento queda disponible para lectores de pantalla.
- El primer fotograma es el respaldo WebP local. Se muestra durante la carga, con movimiento reducido, ahorro de datos o si la reproducción falla.
- No hay descarga de video hasta que entra en pantalla. Con movimiento reducido o ahorro de datos, solo se carga cuando el visitante pulsa Reproducir.
- Pausa al abrir la ficha, el carrito o el menú; fuera de pantalla y con la pestaña oculta. Una pausa deliberada del visitante se conserva al volver a la escena.
- Si el navegador bloquea la reproducción automática, Reproducir permite iniciarla manualmente.

El video se sirve desde el mismo proyecto de Vercel. No hace llamadas a Higgsfield ni requiere nuevas variables o SQL. El postre estrella utiliza la fotografía del catálogo; no se reproduce una segunda película.

La pieza se muestra únicamente para `torta-chocolate` con su portada original. Si administración cambia la portada del producto, la web utiliza esa fotografía; si no hay productos disponibles no muestra una torta inventada.

## Verificación

Las pruebas de navegador comprueban reproducción real con avance de tiempo y dimensiones decodificadas, versión móvil, pausa, pestaña oculta, visibilidad, movimiento reducido, ahorro de datos, bloqueo de autoplay, error de red y apertura de las fichas desde ambas secciones. El recorrido comercial existente mantiene invitados, presentaciones, favoritos, carrito y la entrega a WhatsApp interceptada en las pruebas.

Las capturas se revisan en 375, 700, 768, 1024 y 1440 px. Las pruebas no sustituyen la aprobación visual del propietario antes del merge.
