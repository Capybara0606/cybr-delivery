# Verificación del MVP
## Automatizadas superadas
| Comando | Alcance |
|---|---|
| npm run check | Next typegen, TypeScript estricto y ESLint. |
| npm run test:db | 41 pruebas: 35 PostgreSQL/PostGIS real + 6 unitarias. Contenedor efímero, puerto loopback y contraseña aleatoria. |
| npm run test:supabase | Auth/PostgREST/Storage reales, roles, rechazo de hashes y signup cerrado. |
| npm run test:flow | Playwright, build producción y Supabase real con tres sesiones separadas. |
| npm run build | Compilación de producción sin necesitar conexión al construir una instalación todavía no configurada. |
| python scripts/smoke.py | Servidor en localhost:3000, rutas/404/manifiestos y cuatro páginas en 1440/390/320 px. Requiere Python Playwright + Chromium del sistema; no son dependencias runtime. |

CI: https://github.com/Capybara0606/cybr-delivery/actions/runs/40612364864. El runner ejecuta el stack completo en un entorno aislado; las credenciales CLI se procesan en memoria sin imprimirlas. Flujo solo acepta localhost, crea usuarios/datos ficticios y limpia al terminar. Nunca apuntarlo a producción.

## Escenario de aceptación ejecutado
Menú de DB -> dos capuchinos 350 x 2 + croissant 275 -> subtotal 975, envío 200 -> pedido 1175 centavos. Sin cuenta de comprador. Reintento devuelve el mismo pedido. Admin recibe/prepara/asigna a Carlos. Carlos acepta, recoge, sale y publica ubicación mediante watchPosition con sensor **emulado por navegador**. Cliente consulta seguimiento autorizado. Código confirma entrega, registra efectivo, elimina GPS y refleja 1175 en ventas.
También se ejercitan CRUD de productos/imágenes/categorías y Realtime suscrito, política offline y manifiestos tienda/driver. Se capturan imágenes de datos ficticios en docs/screenshots/mvp.

## Negativos comprobados
- Rol/negocio ajeno, metadata que intenta hacerse owner, RPC privilegiado desde navegador y hashes privados.
- FK cruzada, precios negativos, snapshots, saltos de estado, historial inmutable y cancelación transaccional.
- Doble submit concurrente del checkout y dos conexiones de administradores compitiendo por asignación.
- Precio inyectado, producto agotado, ubicación fuera de cobertura, tienda cerrada y límites persistidos.
- Conductor ajeno, GPS antiguo/inválido, publicación después de cancelar/entregar y simulación prohibida para restaurante real.
- Código incorrecto persiste intentos; a cinco fallos queda bloqueado.
- Permiso GPS denegado mediante gestor de permisos Chromium, modo offline, última posición marcada stale y simulación identificada.
- Caché PWA sin API/páginas privadas; fallback genérico cuando no hay internet.

## Pendiente físico/manual
No se certificó un teléfono real ni instalación desde Safari/Android. Ensayar GPS en calle, precisión, pérdida de señal, ahorro de batería, navegación externa y pantalla bloqueada. Validar teclados, interacción táctil, sonido y permisos de cada dispositivo. CI emulado no prueba segundo plano.
Prueba manual de piloto requiere servicios persistentes propios, HTTPS, datos de demo claros y cuentas provisionadas; todavía no hay sitio cloud desplegado por indicación del usuario.
