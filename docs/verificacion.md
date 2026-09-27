# Verificación de la primera versión

## Completado

- Compilación de producción con Next.js 16.3.6 y comprobación TypeScript.
- Cinco pruebas unitarias: normalización del carrito, cálculos en céntimos, fechas/Lima, dirección según modalidad y mensaje de WhatsApp.
- Cuatro pruebas de navegador Chromium: dos recorridos en computadora (1440 px) y dos en móvil (390 px).
- Verificado: renderizado del catálogo, carga de imagen principal, búsqueda sin depender de tildes, resultados vacíos, recuperación del carrito tras recarga, incremento de cantidades y solicitud como invitado.
- El enlace externo de WhatsApp fue interceptado durante las pruebas: se comprobó el destinatario y el mensaje, sin enviar nada.
- Verificado: el carrito permanece al regresar y los visitantes son redirigidos a `/cuenta` al abrir la administración o el cambio de contraseña.
- Revisadas capturas de escritorio y celular, sin desplazamiento horizontal de la página.

## Pendiente de configuración externa

No hay un proyecto Supabase conectado. El registro real, el envío de correos, el inicio de sesión, la persistencia de perfiles y la administración con datos reales deben verificarse después de ejecutar `supabase/schema.sql` y configurar Vercel. Las comprobaciones están en `docs/configuracion.md`.

El código aplica autenticación en el servidor, comprobación de rol en cada acción administrativa y políticas RLS en SQL. No se afirma que las políticas se hayan ejecutado en un servidor Supabase real.

El entorno de trabajo usa Node 24; el repositorio y la integración continua fijan Node 22.x para Vercel. La compilación y pruebas locales descritas se ejecutaron con Node 24.

## Notas del entorno de prueba

La automatización `agent-browser` no pudo iniciar su proceso auxiliar en este entorno. Se verificó la aplicación con Playwright y Chromium instalado, mediante las pruebas incluidas. La comprobación final usa el servidor de producción, sin depender del canal HMR de desarrollo.
