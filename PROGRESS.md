# CYBR DELIVERY — progreso
## Estado actual
MVP web implementado y probado con Supabase real en entornos temporales. Mismo motor para plataformas independientes: un despliegue/base por restaurante y diseño personalizable, sin marketplace.
Código en main: https://github.com/Capybara0606/cybr-delivery. El usuario autorizó continuar con despliegue **exclusivamente gratuito**. Supabase Free creado en CYBR; Netlify Free publicado en https://cybr-delivery.netlify.app. Secretos configurados por usuario, registro público cerrado y cuentas owner/driver verificadas.

## Fases y aceptación
| Fase | Resultado |
|---|---|
| 1. Investigación/arquitectura/configuración | Completada. Repo nuevo y tokens CYBR; configuración y tema separados. |
| 2. Supabase/seguridad/seed | Completada. 10 migraciones acumuladas, 18 tablas públicas con RLS, PostGIS, roles y seed Café Aurora. |
| 3. Cliente/checkout | Completada. Menú real/opciones, carrito, ubicación, confirmación explícita del pin, checkout invitado transaccional, idempotencia, precios/horario/cobertura servidor y tracking privado. |
| 4. Administración/Realtime | Completada. Login, Kanban, detalle/historial, CRUD catálogo/categorías/fotos, configuración, flota y ventas reales. Eventos sin PII con RLS y respaldo de actualización. |
| 5. Repartidor | Completada. Turno, aceptación/rechazo, recogida/salida/llegada, navegación, código con cinco intentos, cobro/entrega y liberación atómicos. |
| 6. GPS/mapas | Implementada y probada con navegador emulado. Autorización, edad/precisión, monotonía, stale, simulación explícita y corte al terminar. **Prueba en teléfono físico pendiente.** |
| 7. Pruebas | Completadas las automatizadas. 41 unitarias/DB y flujo Playwright sobre build de producción/Supabase real con tres sesiones. No sustituyen la prueba de campo. |
| 8. PWA/documentación/despliegue | PWA e instalación listas; manifiestos separados de tienda/repartidor, offline genérico sin datos privados, preflight/cron/Vercel e instrucciones Supabase. **Web y Supabase publicados; GPS físico pendiente.** |

## Evidencia
- `npm run check`: tipos de rutas, TypeScript y ESLint correctos, sin advertencias propias.
- `npm run test:db`: 41 pruebas (35 DB + 6 unitarias), PostgreSQL 17/PostGIS 3.5 real, contenedor efímero y limpio.
- `npm run test:supabase`: Auth, PostgREST, Storage, provisión y RLS reales; no registro público ni escalamiento por metadata.
- `npm run test:flow`: compila producción con secretos locales solo en memoria. Cliente compra dos capuchinos + croissant = 975 centavos; envío 200, total 1175. Equipo prepara/asigna, Carlos acepta/recoge/sale, GPS autorizado, código, cobro y venta entregada.
- El flujo también verifica precios alterados, fuera de cobertura, agotados, acceso ajeno, dos submits concurrentes, cancelación, CRUD productos/fotos/categorías, GPS denegado, offline, posición stale, simulación etiquetada, manifiestos y ausencia de datos privados en caché.
- CI de referencia: https://github.com/Capybara0606/cybr-delivery/actions/runs/40612364864 — código cc7c68c. Todos los jobs superados.
- Capturas reales con datos ficticios de la prueba: docs/screenshots/mvp/ (tienda desktop/móvil, panel, repartidor y pedido entregado). Capturas desde build de producción, no componentes falsos.
- `python scripts/smoke.py`: HTTP/404, ambos manifiestos, 4 páginas en 1440/390/320 px, sin desbordamiento ni errores JS; verifica también el enlace al manifiesto específico driver.
- `git diff --check` y revisión de archivos: sin .env reales ni literales de credenciales.

## Incidencias resueltas
GitHub no permitía crear repo; usuario lo creó público y se conservó visibilidad. Supabase completo excedía el disco local; verificación trasladada a runner aislado GitHub. Auth email se habilitó manteniendo signup global cerrado. Prueba E2E encontró y corrigió borrado de código al marcar llegada y resolución incorrecta del worker MapLibre. Manifiesto driver usa ruta explícita para que Next lo exponga correctamente.

## Pendientes concretos
1. Probar APK nativo en teléfono físico y verificar ciclo completo contra la demo publicada. No se usaron bases NanBites/CYBR VIEW ni se creó una Site.
2. Ensayo físico Android/iPhone con permisos, batería, GPS y cambio de app/bloqueo. Una PWA no garantiza GPS en segundo plano; si se necesita, evolucionar driver a app móvil.
3. Operación real: sustituir datos/fotos demo, revisar proveedor de mapas/consumo, confirmar cron/retención y backups. No presentar Café Aurora como negocio real ni dar por certificada producción solo por pasar CI.

Verificación final: ambos jobs de CI superados en cc7c68c. Se añadió prueba de regresión para que un rechazo no aparezca como entrega realizada por ese conductor. Las capturas de docs/screenshots/mvp proceden del run 40611329290 con datos ficticios, revisadas visualmente; la última ejecución volvió a verificar el mismo flujo.

## Despliegue gratuito autorizado — 28 octubre 2026
- Organización CYBR confirmada por usuario; plan `free`, cotización MCP $0/mes. Proyecto `cybr-delivery-mvp`, ref `wpoutxcjrctxijbzdtyy`, us-east-1, ACTIVE_HEALTHY.
- Nueve migraciones y seed aplicados. Historial sincronizado a versiones del repositorio. La API generó una colisión de timestamp al registrar provisioning después de su COMMIT; se verificó función y privilegios, se registró sin repetir DDL y se corrigieron versiones. Migraciones siguientes enviadas sin transacción interna para mantener atomicidad del wrapper.
- Consulta cloud: 18/18 tablas públicas con RLS, 12 productos, 4 categorías, cero pedidos y recepción cerrada. Publicación Realtime solo driver_locations/order_events.
- REST real con clave publishable: productos 200/12 filas; pedidos privados 401. Auth settings: email habilitado, signup abierto por defecto; **debe deshabilitarse en panel antes de crear cuentas/habilitar demo operativa**. No hay herramienta MCP de configuración Auth ni secreto servidor accesible.
- Advisor seguridad: advertencias SECURITY DEFINER para 2 funciones públicas de ubicación/cobertura y 12 funciones autenticadas; exposición intencional con controles internos. No se eliminan permisos necesarios solo para silenciar advertencias. Ver SECURITY.md.
- Netlify Free elegido: admite uso comercial, 300 créditos/mes con límite duro y pausa, sin excedentes cobrados. Vercel Hobby no se adopta para este producto por restricción de uso personal no comercial.
- `netlify.toml`, función diaria cleanup-delivery y TRUST_PROXY=netlify preparados. Compatibilidad/documentación del adaptador comprobadas; despliegue y scheduler remotos todavía no verificados.
- Verificación tras preparar Netlify: npm run check, npm run build, npm test (6 unitarias), git diff --check y rechazo de cron sin credenciales superados. No se afirma build adaptado/deploy Netlify hasta ejecutarlo con cuenta y variables.

## Diagnóstico de variables en Netlify
Despliegue bloqueado por ORDER_TOKEN_SECRET y CRON_SECRET. El preflight ahora distingue variable ausente, vacía, demasiado corta o formato inválido sin imprimir valores. Verificados cuatro casos con entorno sintético; check y build superados. No se rebaja el mínimo de 32 caracteres ni se generan secretos en logs. Publicación sigue pendiente.

## Pruebas sin radio de entrega
Usuario pidió quitar límite de distancia para probar. Migración demo_unrestricted_coverage añade flag privado a ajustes: efectivo solo si restaurants.is_demo=true, sin permiso UPDATE para authenticated. Cobertura y checkout aplican el mismo bypass. Activado en Café Aurora cloud; ubicación Madrid aceptada, y al marcar restaurante no-demo dentro de transacción revertida se vuelve a rechazar. Check, 41 pruebas DB/unitarias y build superados. Horarios/recepción de pedidos permanecen configurables. UI identifica modo de pruebas sin distancia.

## Corrección origen Netlify
POST /api/orders con Origin público reproducía 403 por URL interna del adaptador. Se añade APP_ORIGIN exacto (predeterminado demo cybr-delivery.netlify.app) junto con origen directo de Request. No se confía en forwarded-host; cross-site permanece bloqueado. Siete pruebas de regresión cubren proxy, local, origen ajeno, sufijos falsos, forwarded spoof, configuración inválida y clientes sin Origin.

## App nativa del repartidor iniciada
Expo SDK 58/React Native 0.88 en apps/driver, configuración demo pública sin secretos. Reutiliza Auth/RLS/RPC; login, turno, asignaciones, entrega/cobro/código, navegación externa, historial y GPS TaskManager con permisos/notificación. Sesión SecureStore fragmentada. Sin cola offline. Android primero mientras se confirma plataforma; iOS no compilado.
Verificado: tipos nativos, Expo export Android y manifest prebuild; web check, 17 unitarias y build. APK preparado con workflow manual gratuito de repo público; ejecución pendiente. GPS físico pendiente.
Cloud actualizado: Netlify publicado; usuario confirmó login owner y driver, roles provisionados. Signup cerrado/email habilitado verificados. Origen checkout corregido y comprobado remotamente.

CI nativa en runner limpio pasó en c2a5486 y 4ca44d1. Primer APK falló por paquete Android SDK tools retirado; workflow corregido a platform-tools. Segundo intento 41561769339 en compilación Gradle. Tests de dominio separados de tsconfig Expo para correr en job web sin dependencias móviles instaladas. Netlify build.ignore evita gastar créditos web en cambios solo nativos.

Validación completa CI en 4ca44d1: https://github.com/Capybara0606/cybr-delivery/actions/runs/41561944046 — verify, driver-native y supabase-integration correctos. Expo Doctor 20/20 tras configurar proxy del entorno. APK en compilación; no ensayo físico todavía.

## APK piloto publicado
Build Android 41561769339 superado, fuente exacta 3e89b95891cfde12310224e638366abe24cbecda. APK ARM64 de 21.99 MB con classes.dex, bundle Hermes embebido y configuración pública demo comprobados. Firma v2 verificada mediante biblioteca oficial Android apksig. SHA256 1f654e3f018283ae55ed5ffe7bb0b17a2f6ce193073e31eadf87299180cf0877.
Prerrelease público: https://github.com/Capybara0606/cybr-delivery/releases/tag/driver-v0.1.0-pilot — APK descargable sin cuenta Expo ni PC. Publicación por workflow 41562893489 correcta; subida directa desde workspace falló por credencial limitada al host uploads y se resolvió con token del runner. No se compartieron secretos ni se contrató infraestructura.
Código posterior 4ca44d1 solo reorganiza tests/dominio sin cambios funcionales del APK. CI completa 41561944046 superada. Firma de desarrollo, no publicación Play Store. Pendiente instalar y probar GPS físico/segundo plano con usuario. Notificaciones push y mapa embebido no implementados.

## Compatibilidad de catálogo con Safari 15
Usuario prueba iPad mini 4 / iPadOS 15 y no ve productos. API cloud devuelve 12. Se elimina dependencia obligatoria de crypto.randomUUID (Safari anterior a 15.4) con UUID v4 basado exclusivamente en getRandomValues; almacenamiento local opcional no puede bloquear carga/carrito ni dejar checkout atascado. Admin fotos usa mismo helper, foco modal evita Array.at. Browserslist apunta Safari/iOS 15 para transpilar sintaxis, sin degradar Next/Tailwind ni prometer compatibilidad completa de framework.
Check, 21 unitarias y build correctos. Prueba Chromium de producción con randomUUID ausente y Storage denegado: 12 productos reales (snapshot solo lectura), modal y carrito sin errores, sin enviar pedido. Se añade misma regresión al flujo CI con Supabase real. Safari 15 físico pendiente de confirmación del usuario; CSS/mapa/checkout completo no se certifican por cambiar user-agent o emular APIs.

Despliegue de compatibilidad c67105f verificado en Netlify: prueba contra API real publicada, sin fixtures, con randomUUID ausente y Storage denegado; 12 productos, selección y carrito correctos, cero errores JS, sin enviar pedido. No equivale a certificar Safari 15 físico. CI completa 41564773151 superada: verify (56 pruebas DB/unitarias), driver-native y supabase-integration (Auth/Storage/RLS y flujo completo, incluida nueva regresión de navegador).

## Repartidor 0.2 — recogida y GPS automático de turno
Usuario confirmó compartir durante todo el turno activo, incluso sin pedido; detener fuera de turno y al cerrar sesión, cliente solo durante entrega en camino. Error nativo: tras aceptar, order.status=assigned; app buscaba ready_for_pickup y no mostraba recogida. Corregido con nextDriverAction y pruebas de estados hasta delivered; navegación pre-recogida también corregida.
GPS automático al abrir/iniciar turno con permisos concedidos, indicador global, reintento/ajustes si faltan; ya no se corta al finalizar pedido si el turno continúa. Datos de turno solo última posición en private.driver_shift_locations, RLS y sin acceso directo anon/authenticated; publicación propia con turno y membresía verificados. No se publica en Realtime ni se mezcla con tracking invitado. Cerrar turno elimina posiciones privada/pública con bloqueo de driver para evitar carreras. Logout detiene GPS y cierra disponibilidad antes de salir.
Migración driver_shift_tracking aplicada cloud y verificada: RLS true, sin SELECT cliente ni EXEC anon, nueva tabla vacía (sin posiciones inventadas). Sin modificaciones de pedidos existentes. Retención cron extendida.
Check/build web y 63 pruebas DB/unitarias correctos; tipos nativos y export Android correctos. APK 0.2.0/versionCode2 pendiente de compilación/publicación. Plan admin en ADMIN_LOCATION_PLAN.md; mapa de turno todavía no implementado.

CI completa 41566823039 superada en 4de048d: verify (63 pruebas), driver-native y supabase-integration. Cloud confirma pedido #4 assigned/accepted y turno activo, coherente con el bug corregido, sin modificarlo. APK 0.2 en run 41566828265 compilando.

APK 0.2.0 publicado: https://github.com/Capybara0606/cybr-delivery/releases/tag/driver-v0.2.0-pilot. Build 41566828265 y publicación 41567917072 correctos, fuente 4de048d5536ad64b35d0229606af20ac876bcd6a. APK 21,995,920 bytes, ARM64 y bundle con RPC de turno/acción finalizar verificados. Firma APK v2 válida y certificado igual al piloto 0.1 (actualización sin desinstalar). SHA256 6a5e5fac708e7eb118b8060f88a4304c8bba8a1239197442ef446ec02c1ed147.
Pendiente usuario instale actualización, conceda permisos y compruebe GPS físico durante turno sin pedido, pantalla bloqueada/navegación, entrega con código y cierre de turno. Plan admin entregado, panel no implementado.
