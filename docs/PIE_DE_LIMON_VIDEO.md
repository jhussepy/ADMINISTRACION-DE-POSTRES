# Video del pie de limón

Se incorpora el archivo `gemini_generated_video_4e80e421.mp4` aportado por el propietario. Se mantienen sus planos, movimiento, duración y encuadre horizontal de 16:9. No se regeneró el postre ni se añadieron movimientos artificiales. El audio se retira de las copias para web.

## Dónde aparece

- **El toque Yemape:** el pie de limón es el postre destacado cuando está activo en el catálogo. El botón «Elige tu presentación» abre la ficha rápida del mismo producto. Si no está disponible, se utiliza otro producto del catálogo con su foto, sin mostrar una película ajena.
- **Ficha y vista rápida:** la galería de `pie-limon` conserva las fotos administradas y agrega una miniatura «Video». Solo se solicita la película al elegirla. «Ampliar video» abre una ventana; cerrar esa ventana conserva la ficha y devuelve el foco al botón.
- La película está vinculada al identificador `pie-limon` en `lib/product-media.ts`. Cambiar las fotos del panel no elimina el video. El panel actual administra fotos; sustituir este video se hace mediante un nuevo cambio de código y archivos.

## Reproducción y rendimiento

- Reproducción silenciosa y una sola vez. Al terminar permanece el último plano y se ofrece «Ver otra vez»; no hay un salto automático al primer plano.
- El video destacado se solicita al entrar en pantalla. Con movimiento reducido o ahorro de datos, aparece el fotograma de respaldo hasta que el visitante pulsa Reproducir.
- Elegir «Video» o ampliarlo es una acción explícita y permite reproducirlo aun con esas preferencias. Una pausa deliberada se conserva al salir de pantalla y regresar.
- Pausa fuera de pantalla, con la pestaña oculta y durante los paneles que cubren la escena. Ampliar el video pausa el reproductor de la ficha para que no siga reproduciéndose debajo.
- Si el navegador bloquea la reproducción automática, se conserva un control manual. Ante un error de red, se muestra el fotograma y siguen disponibles las fotos, presentaciones y compra.
- MP4 H.264 y WebM VP9. Se selecciona una sola versión según compatibilidad y tamaño al iniciar la reproducción: 1280 × 720 en escritorio, 768 × 432 hasta 700 px.
- Copias MP4: aproximadamente 1,12 MB en escritorio y 0,45 MB en celular, frente a 4,14 MB del original. El fotograma WebP proviene del segundo 2 del mismo clip.

No requiere SQL, nuevas variables de entorno ni servicios externos de generación de video.

## Verificación y capturas

Las pruebas de navegador comprueban carga por visibilidad, dimensiones decodificadas, reproducción única, repetición, pausa, preferencias de accesibilidad, galería, ventanas anidadas, foco y disponibilidad del carrito. Las pruebas no envían mensajes ni realizan cobros.

[Sección en computadora](pie-film-desktop.webp) · [Sección en celular](pie-film-mobile.webp) · [Ficha en computadora](pie-film-product-desktop.webp) · [Ficha en celular](pie-film-product-mobile.webp) · [Video ampliado en celular](pie-film-expanded-mobile.webp)
