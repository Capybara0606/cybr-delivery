# CYBR DELIVERY — progreso
## Estado actual
MVP web implementado y probado con Supabase real en entornos temporales. Mismo motor para plataformas independientes: un despliegue/base por restaurante y diseño personalizable, sin marketplace.
Código en main: https://github.com/Capybara0606/cybr-delivery. El usuario autorizó fases 3–8 y luego eligió **dejar el despliegue preparado por ahora**. No crear servicios cloud ni publicar el sitio hasta una nueva indicación.

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
| 8. PWA/documentación/despliegue | PWA e instalación listas; manifiestos separados de tienda/repartidor, offline genérico sin datos privados, preflight/cron/Vercel e instrucciones Supabase. **Despliegue cloud pospuesto por el usuario.** |

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
1. Crear/vincular Supabase dedicado y configurar secretos de hosting; seguir DEPLOYMENT.md. No se usaron bases NanBites/CYBR VIEW ni se creó una Site.
2. Ensayo físico Android/iPhone con permisos, batería, GPS y cambio de app/bloqueo. Una PWA no garantiza GPS en segundo plano; si se necesita, evolucionar driver a app móvil.
3. Operación real: sustituir datos/fotos demo, revisar proveedor de mapas/consumo, confirmar cron/retención y backups. No presentar Café Aurora como negocio real ni dar por certificada producción solo por pasar CI.

Verificación final: ambos jobs de CI superados en cc7c68c. Se añadió prueba de regresión para que un rechazo no aparezca como entrega realizada por ese conductor. Las capturas de docs/screenshots/mvp proceden del run 40611329290 con datos ficticios, revisadas visualmente; la última ejecución volvió a verificar el mismo flujo.
