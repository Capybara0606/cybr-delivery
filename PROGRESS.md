# CYBR DELIVERY — progreso
## Estado actual
Fase 2 completada y verificada. Fase 3 no iniciada ni autorizada todavía.
Producto: mismo motor para plataformas independientes; un despliegue/base por restaurante y diseño personalizable. No marketplace ni catálogo de negocios.
Repositorio público creado por el usuario: https://github.com/Capybara0606/cybr-delivery. Código en main, sin secretos. Sitio y Supabase cloud aún no desplegados/vinculados.

## Fase 1 — completada
Repo nuevo con Next.js, TypeScript estricto, Tailwind y tokens CYBR tomados de cybr-view como referencia visual. Configuración de instalación y tema separados. Rutas /, /admin, /driver y /api/health; interfaces explícitamente en preparación. Investigación, arquitectura y decisiones documentadas. Build/tipos/lint y navegación Chromium 1440/390/320 px verificados. Commit inicial 8da2663.

## Fase 2 — entregables
- 4 migraciones SQL transaccionales: 17 tablas con RLS, PostGIS, 3 enums, FK compuestas, índices y precios en centavos.
- Seed idempotente Café Aurora: 4 categorías, 12 productos, modificador de leche, Carlos y Andrea sin cuentas/contraseñas compartidas. Ubicación ficticia y recepción cerrada por defecto.
- Permisos owner/staff/driver, perfiles Auth sin rol de metadata y provisión de membresías exclusiva de servicio.
- RPCs de cobertura, preparación de pedidos, disponibilidad, asignación exclusiva, aceptación/rechazo y cancelación integral, con historial y bloqueo de filas.
- Bucket de imágenes y políticas de escritura por negocio; cliente sin acceso a hashes de tracking/código.
- Clientes Supabase browser/SSR, autorización con getUser y validación de claves públicas.
- Scripts de provisión, pruebas DB efímeras y suite real Supabase; CI en GitHub Actions.

## Evidencia
- `npm run check`: TypeScript y ESLint sin errores/advertencias.
- `npm test`: 3 unitarias de configuración pública y rechazo de claves privilegiadas.
- `npm run test:db`: 30 pruebas pasan (27 DB + 3 unitarias), PostgreSQL 17/PostGIS 3.5 real, contenedor efímero. Incluye dos conexiones compitiendo por un pedido, permisos, snapshots, seed repetido, integridad, estados y cancelación.
- `npm run build`: producción compilada. HTTP 200 en las cuatro rutas; health fase 2/backend no configurado refleja correctamente esta instancia sin credenciales.
- Supabase completo arrancó en GitHub Actions: migraciones/seed reales, Auth email/password owner y driver, RLS/PostgREST, registro público cerrado, provisión solo servicio, hashes privados, escritura Storage por rol y RPC PostGIS.
- Evidencia de integración y verificación principal: https://github.com/Capybara0606/cybr-delivery/actions/runs/40606348081 (código e8c4c3b). Todos los pasos de verificación superados; usuarios/objetos temporales eliminados por la suite.
- `git diff --check` y revisión de archivos versionados: sin .env reales ni literales de credenciales.

## Incidencias resueltas
1. GitHub integration no podía crear repo (createRepository); usuario lo creó y se subió código conservando su visibilidad pública.
2. Supabase completo no cabía durante descompresión en el Docker local (96% disco); se canceló y recuperó espacio. Verificación completa trasladada a runner aislado GitHub.
3. Auth real detectó proveedor email deshabilitado. Se mantiene auth.enable_signup=false con auth.email.enable_signup=true: registro público cerrado y login de empleados provisionados habilitado. Suite repetida y superada.

## Límites
No hay checkout público, login UI, administración funcional, seguimiento invitado ni GPS. Hay fundación de datos y permisos, no MVP de compra terminado. No se creó proyecto cloud ni se desplegó aplicación. La prueba HTTP usa stack real efímero en CI, no producción.

## Siguiente fase
Fase 3: catálogo conectado y checkout invitado. Crear operación transaccional de compra con precios/opciones/horario/cobertura validados, idempotencia de solicitud, tokens seguros, rate limiting y pruebas de compra. Requiere autorización; las fases 4–8 siguen sin iniciar.
Antes de conectar una instalación persistente: crear proyecto Supabase dedicado o disponer de entorno local con espacio suficiente; ver SUPABASE.md. No usar bases de NanBites/CYBR VIEW.

## Nueva autorización: fases 3–8
El usuario autoriza continuar todas las fases y desplegar sitio/Supabase si resulta conveniente.
Secuencia: (3) checkout transaccional + tienda, (4) login/admin + CRUD/Realtime, (5) driver/entrega, (6) GPS/mapas, (7) pruebas integrales, (8) PWA/publicación. No se requiere otra aprobación entre fases.
Dependencia externa: no hay credenciales cloud Supabase en el entorno. Se solicitó configuración segura mientras avanza desarrollo. No se sustituirá la persistencia por arrays simulados.
Aceptación: precio 1175 centavos desde DB, estados y permisos en servidor, idempotencia/concurrencia, token tracking privado, GPS autorizado/frescura, interfaces responsive y build/tests/CI correctos. Prueba GPS física requiere teléfono; no se declarará aprobada con simulación.

Fase 3 implementada: tienda conectada por API, carrito local, opciones, checkout invitado transaccional, idempotencia, cobertura/horario/precios servidor, tracking con token en fragmento URL y límites persistidos. 36 pruebas y build superados; E2E se ampliará en Fase 7. Fase 4 en implementación: sesiones de equipo, Kanban/CRUD y eventos Realtime sin PII con RLS.

Fase 4: API de equipo y panel Kanban, estados, detalle/historial, CRUD de productos/categorías, ajustes y flota implementados. Los eventos Realtime contienen solo identificadores/estado y usan RLS; se mantiene actualización de respaldo. Tipos/lint y la suite SQL se ejecutan antes de continuar.

Fases 5–6 implementadas y verificadas en SQL: flujo driver, cinco intentos de código, cobro al entregar, GPS autorizado con fecha/precisión y exclusión mutua con cancelación. 40 tests y build superados. Seguimiento invitado actualiza cada 5 s y distingue posiciones obsoletas/simuladas; no se promete GPS de fondo. Fase 7 añade prueba Playwright de flujo completo con Supabase real en CI (pendiente de resultado). Usuario pidió dejar despliegue preparado por ahora; no crear Site ni proyectos cloud.
