# Portada 3D de Yemape

La portada adapta la profundidad, los objetos independientes y los cambios de perspectiva de la referencia Coffee a la tienda de Yemape. Se utiliza código propio y un modelo construido para el proyecto; no se copia la plantilla ni sus recursos.

## Escena y alcance visual

El modelo `public/models/yemape-chocolate.glb` tiene geometría real, una torta, una porción independiente y migas. Contiene materiales PBR y texturas embebidas y permite ver sus caras posteriores. El giro no se obtiene rotando una fotografía plana.

Es una representación ilustrativa de chocolate, crema y frutas, no una reconstrucción fotogramétrica del producto. Las fotos reales, descripciones, presentaciones y precios de la ficha siguen siendo la fuente para comprar. Si se reemplaza la portada original del producto en la administración, la home usa esa fotografía y no impone el modelo ilustrativo.

La escena se creó con scripts de Blender en 3D Jutsu. Los archivos `tools/create-dessert-scene.py` y `tools/refine-dessert-scene.py` conservan la construcción y las mejoras de materiales; requieren Blender y el registro `artifacts` del entorno de creación. No contienen ni envían fotos o videos del usuario. La aplicación publicada sirve el GLB desde Vercel, sin llamadas a Higgsfield ni claves nuevas.

## Movimiento e interacción

- Giro completo sobre el eje vertical y cambios moderados de inclinación; la escala del postre permanece fija.
- Arrastre horizontal para cambiar el ángulo; en pantalla táctil se conserva el scroll vertical.
- Botones de vista anterior, restablecer y vista siguiente; las flechas y Home también funcionan al enfocar la escena.
- Una pausa controla ambas escenas. La animación se detiene fuera de pantalla, al ocultar la pestaña y al abrir el detalle o el carrito y al activar movimiento reducido, incluso después de cargar la página.
- El detalle del producto y el carrito siguen usando el flujo de la tienda.

## Carga, rendimiento y respaldo

Three.js se carga mediante importación dinámica al acercarse la escena a la pantalla. Ambas escenas comparten la carga y decodificación del modelo. El GLB optimizado ocupa aproximadamente 1,35 MB, con tres partes y unas 56 mil caras triangulares; conserva sus nombres para animar la porción por separado.

En la web se reutiliza la fotografía ya decodificada para las texturas de miga y fruta, sin solicitar otra variante. Se corrigen las coordenadas de material sobre las superficies unidas del GLB, incluidas las caras independientes de las frutas. Una sombra de 512 px refuerza el volumen sin añadir otro recurso descargable.

El renderizado se limita a 30 fps y la resolución a 1,5 veces el tamaño CSS. En renderizadores por software (SwiftShader, llvmpipe y similares), usa 15 fps, resolución 1 y prescinde del pase de sombras para mantener la interacción. Se liberan contextos, observadores, listeners, geometrías, materiales y texturas al salir. Las fotografías aparecen desde el servidor y permanecen disponibles si falla la carga o se pierde el contexto WebGL.

Optimización reproducible, sobre el GLB exportado original:

```sh
npx @gltf-transform/cli@4.3.0 optimize original.glb public/models/yemape-chocolate.glb --compress quantize --flatten false --join false --palette false --texture-compress webp --texture-size 512 --simplify-error 0.0001
```

## Publicación y verificación

Se actualiza el mismo PR #35. Integrarlo y esperar Vercel; no requiere SQL ni variables nuevas. Se añaden `three` y sus tipos, con versiones fijadas en el lockfile.

Las pruebas verifican que el frente y la parte posterior produzcan imágenes distintas, completan un giro con los controles, comprueban pausa y preferencias activas, cuentan una sola petición de modelo para ambas escenas y agregan productos desde las dos secciones. También cubren el respaldo fotográfico y cinco anchos de pantalla, junto con la suite existente de la tienda.

En CI se ejecuta un navegador a la vez: los contextos WebGL por software comparten la CPU del runner. Se mantienen las mismas pruebas y los límites de las comprobaciones individuales; las verificaciones no se omiten.

La galería solo inicia el renderizado al entrar en pantalla, a 30 fps (15 en software). La torta anima cuando al menos el 25 % de su escena está visible. Las pruebas siguen usando movimiento normal para verificar la compra. Los recorridos largos disponen de 60 segundos, con los mismos límites de comprobación por paso. El trace conserva DOM, pasos y red; se evitan capturas continuas del framebuffer para no saturar WebGL por software. Las capturas de verificación se toman explícitamente.
