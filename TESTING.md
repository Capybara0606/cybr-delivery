# Verificación
Fase 1: npm ci, npm run check, npm run build; ejecutar servidor de producción y comprobar /, /admin, /driver, /api/health y 404. Verificar respuesta health distingue DB no configurada de HTTP saludable.
Validación visual y de accesibilidad manual pendiente si no hay navegador disponible. No declarar GPS probado con HTTP o simulación.
Fase 2: integración PostgreSQL/Supabase con roles reales, instalaciones independientes, invitado y privilegios mínimos; rollback e idempotencia; intentos de alterar precio; concurrencia en asignación.
Fase 3-7: Vitest para reglas de dominio y Playwright para compra/admin/driver. No añadir pruebas que repitan constantes sin ejercer comportamiento.
Aceptación final: 2 capuchinos de 350 + croissant 275 = 975 centavos, envío 200, total 1175; operación hasta entrega con código. Negativos: agotado, fuera de cobertura, doble submit, roles ajenos, GPS denegado/antiguo/desconectado y dos administradores asignando.
Prueba GPS física con permiso, pantalla abierta, cambio a navegación externa y bloqueo de pantalla. Documentar teléfono, SO/navegador y límites observados.

Ejecución Fase 1: tipos, lint y build superados. HTTP 200/404 y navegación Chromium verificados en 1440, 390 y 320 px sin overflow ni pageerror. Ejecutar `python scripts/smoke.py` con servidor producción en puerto 3000, Python Playwright y Chromium del sistema; no son dependencias runtime de la aplicación. Capturas en docs/screenshots. No se han ejecutado pruebas de fases futuras.
