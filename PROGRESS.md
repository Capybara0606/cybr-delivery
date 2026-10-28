# CYBR DELIVERY — progreso
## Estado actual
MVP web implementado y probado con Supabase real en entornos temporales. Mismo motor para plataformas independientes: un despliegue/base por restaurante y diseño personalizable, sin marketplace.
Código en main: https://github.com/Capybara0606/cybr-delivery. El usuario autorizó continuar con despliegue **exclusivamente gratuito**. Supabase Free creado en CYBR; alojamiento Netlify Free preparado, pendiente de cuenta/acceso y secretos. No se ha publicado una URL web.

## Fases y aceptación
| Fase | Resultado |
|---|---|
| 1. Investigación/arquitectura/configuración | Completada. Repo nuevo y tokens CYBR; configuración y tema separados. |
| 2. Supabase/seguridad/seed | Completada. 9 migraciones acumuladas, 18 tablas públicas con RLS, PostGIS, roles y seed Café Aurora. |
| 3. Cliente/checkout | Completada. Menú real/opciones, carrito, ubicación, confirmación explícita del pin, checkout invitado transaccional, idempotencia, precios/horario/cobertura servidor y tracking privado. |
| 4. Administración/Realtime | Completada. Login, Kanban, detalle/historial, CRUD catálogo/categorías/fotos, configuración, flota y ventas reales. Eventos sin PII con RLS y respaldo de actualización. |
| 5. Repartidor | Completada. Turno, aceptación/rechazo, recogida/salida/llegada, navegación, código con cinco intentos, cobro/entrega y liberación atómicos. |
| 6. GPS/mapas | Implementada y probada con navegador emulado. Autorización, edad/precisión, monotonía, stale, simulación explícita y corte al terminar. **Prueba en teléfono físico pendiente.** |
| 7. Pruebas | Completadas las automatizadas. 41 unitarias/DB y flujo Playwright sobre build de producción/Supabase real con tres sesiones. No sustituyen la prueba de campo. |
| 8. PWA/documentación/despliegue | PWA e instalación listas; manifiestos separados de tienda/repartidor, offline genérico sin datos privados, preflight/cron/Vercel e instrucciones Supabase. **Supabase cloud creado; publicación web pendiente de acceso a hosting.** |

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
1. Configurar Netlify Free, secretos de servidor y Auth cloud (registro cerrado + URL exacta); seguir DEPLOYMENT.md. Supabase dedicado creado; no se usaron bases NanBites/CYBR VIEW ni se creó una Site.
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
