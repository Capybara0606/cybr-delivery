# Verificación
Fase 1: npm ci, npm run check, npm run build; ejecutar servidor de producción y comprobar /, /admin, /driver, /api/health y 404. Verificar respuesta health distingue DB no configurada de HTTP saludable.
Validación visual y de accesibilidad manual pendiente si no hay navegador disponible. No declarar GPS probado con HTTP o simulación.
Fase 2: integración PostgreSQL/Supabase con roles reales, instalaciones independientes, invitado y privilegios mínimos; rollback e idempotencia; intentos de alterar precio; concurrencia en asignación.
Fase 3-7: Vitest para reglas de dominio y Playwright para compra/admin/driver. No añadir pruebas que repitan constantes sin ejercer comportamiento.
Aceptación final: 2 capuchinos de 350 + croissant 275 = 975 centavos, envío 200, total 1175; operación hasta entrega con código. Negativos: agotado, fuera de cobertura, doble submit, roles ajenos, GPS denegado/antiguo/desconectado y dos administradores asignando.
Prueba GPS física con permiso, pantalla abierta, cambio a navegación externa y bloqueo de pantalla. Documentar teléfono, SO/navegador y límites observados.

Ejecución Fase 1: tipos, lint y build superados. HTTP 200/404 y navegación Chromium verificados en 1440, 390 y 320 px sin overflow ni pageerror. Ejecutar `python scripts/smoke.py` con servidor producción en puerto 3000, Python Playwright y Chromium del sistema; no son dependencias runtime de la aplicación. Capturas en docs/screenshots. No se han ejecutado pruebas de fases futuras.

## Fase 2 — verificación de fundación
`npm test`: 3 pruebas de configuración pública (rechaza clave privilegiada, HTTP remoto y configuración parcial).
`npm run test:db`: 27 casos sobre PostgreSQL 17/PostGIS 3.5 real y roles SQL. El runner crea un contenedor efímero con contraseña aleatoria/puerto loopback y lo elimina al terminar. Incluye las 3 unitarias: total 30.
Cubre migraciones desde cero, seed dos veces, 17 tablas RLS, anónimo sin pedidos, catálogo agotado/inactivo, metadata sin privilegios, edición de menú por rol, FK cruzada, precios negativos, ajustes owner, cobertura geográfica real, totales 1175 centavos, protección de hashes y snapshots, idempotency key única, transiciones/auditoría, disponibilidad propia, asignación, rechazo, cancelación integral, Storage por ruta, provisión solo servicio y dos conexiones compitiendo por el mismo pedido.
La prueba transaccional comprueba rollback en DB; no prueba checkout, que aún no existe. Los contratos mínimos auth/storage del harness no sustituyen sus servicios HTTP.
`npm run test:supabase`: prueba adicional contra Supabase local completo con Auth/PostgREST/Storage, usuarios temporales y contraseñas aleatorias solo en memoria; sin correos enviados. Ejecutar después de `supabase start`.
GitHub Actions corre check, unitarias, DB real y build. La suite HTTP de Supabase es local y no está incluida aún en CI por su mayor coste de arranque.

Resultado suite HTTP Supabase: NO EJECUTADA. El arranque completo se detuvo durante descarga/descompresión antes de llenar el disco (96% utilizado). El runner PostgreSQL/PostGIS sí ejecutó las 30 pruebas y elimina su contenedor al terminar. No se puede concluir que Auth/Storage HTTP funcionen a partir de ese resultado.
