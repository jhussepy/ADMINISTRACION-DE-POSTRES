# Dirección visual de Yemape

## Iteración de catálogo: investigación y decisiones

Aplicamos el método de Refero a la captura de tienda de repostería compartida por el propietario y al diseño existente de Yemape. Esta iteración usa esas referencias visibles; no presupone acceso a la biblioteca de pago de Refero.

**Referencia principal:** la captura muestra categorías en una columna lateral y fotografías amplias agrupadas en una zona de productos. Conservamos la separación clara entre explorar y elegir, adaptada a una carta más pequeña y a la identidad vino y crema de Yemape. **Referencia secundaria:** la portada existente de Yemape aporta la tipografía editorial, los tonos suaves y la fotografía real como protagonista.

| Decisión | Procedencia | Aplicación |
| --- | --- | --- |
| Categorías a la izquierda en escritorio | Captura compartida | Columna estrecha y selección visible; la cuadrícula mantiene tres productos por fila. |
| Fotografías principales sin elementos decorativos añadidos | Catálogo de Yemape | Imágenes existentes en formato cuadrado en escritorio, con nombre y presentación bajo la foto. |
| Navegación horizontal en celular | Límite de ancho y recorrido de compra | Categorías desplazables por tacto encima de la carta; no ocupan una columna lateral. |
| Filtro activo y acción para limpiarlo | Enlaces compartibles del catálogo | El visitante ve qué está filtrando y puede volver a toda la carta; la URL se actualiza. |
| Colores y tipografía | Identidad visual de Yemape | Fondo crema, acento vino solo para acciones y selección, titulares editoriales. |

El recorrido sigue siendo: categoría o búsqueda → ficha o carrito → revisión → WhatsApp. La cuenta es opcional, y los precios de ejemplo se señalan como tales hasta sustituirlos por datos confirmados.

La captura de referencia aporta la jerarquía: encabezado con buscador, cuenta y carrito, fotografía principal, categorías y catálogo. Yemape conserva su propia marca.

- Fondo crema, acento vino, rosa suave y bloques secundarios en tonos variados.
- Tipografía editorial para titulares; sans serif para navegación y formularios.
- Tres fotografías de producto, cuatro diseños y un emblema aportados por el propietario, convertidos a WebP sin cambiar el contenido. Las imágenes son referenciales y así se comunica en el catálogo.
- Portada con torta de chocolate, texto breve y acceso directo a su ficha. Si ese producto no está en el catálogo, se muestra el primer producto disponible.
- Nuevos productos: torta de chocolate, terremoto de lúcuma y keke de arándanos. Los productos previos conservan sus identificadores y el carrito persistido sigue siendo válido.
- Las tres fotografías pasan de 9,69 MB de PNG a 0,70 MB de WebP (aproximadamente 93 % menos), sin recortes ni cambios de contenido; el encuadre del catálogo se adapta con CSS.
- CTA principal: elegir un producto. CTA de cierre: finalizar por WhatsApp.
- Carrito en diálogo nativo, con cierre por Escape, foco contenido y fondo no interactivo.
- Cuenta opcional: el formulario de pedido siempre tiene un camino de invitado.
- Estado inicial sin precios confirmados: por consultar; nunca se presenta como gratis.
- La tienda conserva las cantidades, pero no guarda nombre ni dirección del invitado en localStorage.
