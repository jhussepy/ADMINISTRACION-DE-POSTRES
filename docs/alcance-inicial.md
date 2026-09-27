# Repostería Yemape

Proyecto de catálogo y administración de postres. **Estado: definición inicial; la aplicación todavía no está implementada ni desplegada.**

## Experiencia acordada

- Catálogo público, adaptable a celular y computadora.
- Dos opciones para el cliente: comprar como invitado o iniciar sesión voluntariamente.
- Explorar, buscar y agregar productos al carrito sin registrarse.
- Mantener el carrito al iniciar sesión y al volver al catálogo.
- Elegir cantidades y presentaciones, revisar el pedido y completar los datos de entrega o recojo.
- Finalizar por WhatsApp en ambos modos. Iniciar sesión nunca debe ser obligatorio para comprar.
- WhatsApp del negocio: +51 934 219 749. El sitio prepara el mensaje; el cliente decide enviarlo desde WhatsApp.
- Enviar productos, presentaciones, cantidades, importes disponibles, nombre, modalidad, fecha solicitada y observaciones. Solicitar dirección solo para delivery.
- Confirmar disponibilidad, fecha, costo de delivery y forma de pago por WhatsApp. Abrir WhatsApp no equivale a confirmar, pagar ni entregar un pedido.
- No vaciar el carrito automáticamente al abrir WhatsApp: no se puede comprobar que el cliente haya enviado el mensaje.

## Cuenta opcional

La cuenta del cliente podrá guardar sus datos y direcciones para facilitar compras futuras. La autenticación deberá ser real y el acceso a datos privados deberá validarse en el servidor. Un pedido preparado o una apertura de WhatsApp no se presentará como una compra confirmada. El historial de pedidos confirmados requerirá registro y actualización desde la administración.

La administración del negocio será privada y tendrá permisos distintos a los de los clientes. No publicar datos personales, claves ni secretos en este repositorio.

## Dirección visual

Referencia aportada por el propietario: https://www.mariaalmenara.pe/ y una captura de su página principal.

Adaptar la organización observada: encabezado con marca, buscador, acceso a cuenta y carrito; fotografía principal de producto; categorías visibles; catálogo fácil de recorrer. Mantener identidad propia de Yemape, sin reutilizar el logo, las fotos ni los textos comerciales de la referencia.

Propuesta para desarrollar: fondos claros, acentos pastel variados, texto oscuro de buen contraste, fotografías de producto protagonistas y botones legibles. En móvil, mantener acceso claro al carrito y evitar que los elementos flotantes tapen formularios.

## Administración propuesta

Productos y presentaciones, precios, disponibilidad, pedidos, adelantos y saldos, costos de recetas, inventario de insumos, ingresos y gastos. Estos módulos son alcance propuesto para las siguientes etapas; no están implementados.

## Criterios de aceptación

1. Un invitado completa el recorrido hasta WhatsApp sin encontrar un bloqueo de registro.
2. Un cliente que inicia sesión conserva su carrito y puede usar sus datos guardados.
3. El carrito permite cambiar cantidades y eliminar productos, con importes recalculados y moneda PEN.
4. Los precios, presentaciones y disponibilidad proceden del catálogo del negocio; no se inventan precios de venta.
5. El costo de delivery pendiente se distingue del subtotal de productos.
6. Los datos obligatorios se validan; las fechas usan la zona horaria America/Lima y se validan como fechas reales.
7. El mensaje de WhatsApp conserva tildes, saltos de línea y caracteres especiales mediante codificación de URL.
8. Abrir WhatsApp no genera estados de pago ni confirmaciones falsas.
9. Un cliente o visitante no puede consultar ni modificar información administrativa.
10. La navegación y formularios funcionan con teclado, etiquetas visibles y tamaños adecuados en móvil.

## Información pendiente para la implementación comercial

- Catálogo definitivo, presentaciones, precios y fotos de cada producto.
- Dirección de recojo, horarios, zonas y condiciones de delivery.
- Anticipación mínima por producto y condiciones de pedidos personalizados.
- Identidad visual definitiva y datos que se guardarán en cuentas.
- Configuración de autenticación y almacenamiento persistente antes de habilitar cuentas reales.

El repositorio será la fuente del proyecto. El destino previsto para el despliegue es Vercel; todavía no existe una publicación de esta aplicación.
