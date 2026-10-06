# Identidad visual de Yemape

La tienda, la cuenta y el área de gestión comparten marfil, vino, rosa suave y pistacho. `app/yemape-design.css` reúne los ajustes sobre las hojas de cada función: superficies, jerarquía tipográfica, tarjetas, botones y adaptación a pantallas pequeñas.

## Cambios

- Categorías fotográficas con marcos redondeados y fondos alternos; carta y fichas con superficies y selección más claras. Se conservan los videos y las fotografías existentes.
- Cuenta con el fotograma real del pie de limón, información y acceso separados.
- Administración con navegación lateral en escritorio, fila desplazable en celular y página activa accesible (`aria-current`). Pedidos, productos, pagos, clientes y calendario conservan sus rutas y controles.
- Pagos, seguimiento, privacidad y estados de página utilizan las mismas superficies y tipografía.
- DM Sans y Playfair Display se sirven mediante `next/font/local`, sin peticiones a Google Fonts. Los archivos WOFF se generaron sin cambiar los glifos desde los TTF oficiales de google/fonts. Licencias OFL incluidas en `app/fonts/`.

## Verificación

- Compilación de producción y 30 pruebas de lógica realizadas durante la implementación.
- Pruebas de carrito, selección de presentaciones, galería, foco de validaciones y coordinación de pedidos en escritorio y celular.
- `tests/design-review.spec.ts` revisa seis rutas públicas a 320, 390, 760, 1024 y 1440 px, ausencia de peticiones de fuentes externas y redirección de administración sin sesión.
- Revisión visual local de ocho pantallas administrativas renderizadas con datos ficticios y acciones deshabilitadas, a los mismos cinco anchos. Es una comprobación de composición; no sustituye la revisión con una cuenta administrativa real. No se añadieron rutas de demostración ni accesos alternativos al despliegue.

No requiere SQL ni variables de entorno nuevas. Las reglas de autenticación, pedidos y pagos se mantienen en sus módulos existentes.
