# Galería de destacados

La portada muestra hasta seis productos activos del catálogo, respetando su orden. Usa las fotografías y los nombres que ya se administran en Productos. No requiere una migración ni nuevas variables de entorno.

La galería es una implementación propia inspirada en el movimiento de una cinta ondulada: cada fotografía se dibuja sobre una tarjeta curvada con profundidad. No convierte la fotografía en un modelo tridimensional del postre.

## Interacción

- Se puede explorar arrastrando, con los botones anterior/siguiente, con los selectores de producto o con las flechas del teclado. Inicio y Fin llevan al primer y último producto.
- El movimiento automático se detiene al pasar el puntero, al enfocar un control y al interactuar. El botón de reproducción permite activarlo otra vez; el foco o puntero dentro de la galería siguen pausándolo mientras se interactúa.
- La tarjeta central y el botón «Ver este postre» abren la ficha existente, donde el cliente elige presentación y cantidad para su carrito.
- Con menos de cinco productos, la navegación tiene extremos y el movimiento automático no se ofrece.
- Con movimiento reducido, sin WebGL, ante un fallo de carga o pérdida del contexto gráfico, se muestra una lista de fotografías navegable y operativa.

## Rendimiento

El renderizador se importa cuando la galería se acerca a la pantalla. Las texturas usan imágenes optimizadas a 750 px y el lienzo limita la densidad de píxeles. La animación se detiene fuera de pantalla, en pestañas ocultas y cuando queda pausada. Al desmontar el componente se liberan texturas, buffers, observadores y eventos.

Los nombres, descripciones y controles son HTML accesible fuera del lienzo. El catálogo completo mantiene sus filtros, favoritos y botones de compra.
