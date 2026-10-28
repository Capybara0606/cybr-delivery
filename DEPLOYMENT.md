# Despliegue preparado — no ejecutado
El usuario pidió dejar sitio/Supabase preparados por ahora. No hay URL live ni proyecto cloud vinculado. Repositorio fuente: https://github.com/Capybara0606/cybr-delivery.

## 1. Supabase dedicado
Crear proyecto nuevo por restaurante, separado de desarrollo/producción. No reutilizar NanBites/CYBR VIEW. Usar CLI autenticada en máquina de confianza; nunca registrar token en Git.
Vincular con `npx supabase link --project-ref <REF>` usando el mecanismo seguro del CLI/entorno y después `npx supabase db push --linked`. Revisar migraciones antes de aplicarlas. Las migraciones crean esquema/funciones/Storage/eventos; no recrean datos de otros proyectos.
Seed de Café Aurora solo para demo: aplicar supabase/seed.sql con SQL Editor o procedimiento administrado. No ejecutarlo sobre catálogo real: actualiza precios de demostración. Dar de alta usuarios Auth y provisionar owner/staff/driver según SUPABASE.md; sin contraseñas compartidas.
Configurar Auth: registro público cerrado, proveedor email/password habilitado, URL de sitio y redirects exactos. config.toml por sí solo configura lo local, no el proyecto cloud. Verificar que Realtime publique order_events y driver_locations con RLS; no publicar orders con hashes.

## 2. Aplicación Vercel
Importar repo, framework Next.js, Node 24. vercel.json incluye comandos de instalación/build y cron diario. Configurar variables por entorno ANTES de compilar:
NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, SUPABASE_SECRET_KEY, ORDER_TOKEN_SECRET, CRON_SECRET, RESTAURANT_ID, NEXT_PUBLIC_RESTAURANT_NAME, TRUST_PROXY=vercel. NEXT_PUBLIC_ENABLE_GPS_SIMULATION=false en cualquier operación real.
Secretos solo servidor; ORDER_TOKEN_SECRET debe mantenerse estable durante pedidos activos (deriva token/código para reintentos). No rotarlo sin plan de migración/vigencia de siete días. Clave privilegiada no se envía al navegador.
`npm run deploy:check` valida forma de configuración sin imprimir valores; no certifica permisos remotos. `npm ci`, check/tests/build antes de desplegar. No desplegar solo frontend esperando que Supabase se cree automáticamente.

## 3. Mapas y HTTPS
Geolocation API requiere HTTPS (excepto localhost). MapLibre sirve su worker desde public/maplibre generado en postinstall/prebuild y conserva licencia BSD. Proveedor inicial OpenFreeMap con atribución OSM/OpenMapTiles; revisar condiciones vigentes y volumen antes de operación o elegir proveedor propio en NEXT_PUBLIC_MAP_STYLE_URL. No usar teselas públicas OSM como CDN sin permiso. No hay geocodificador: dirección escrita + pin manual/GPS del cliente, evitando dependencias extras.

## 4. Mantenimiento
Vercel cron diario a /api/maintenance autenticado mediante CRON_SECRET. Ejecuta cleanup_delivery_data: elimina posiciones sin actualizar de más de 24 h y contadores de más de 2 días. Si se ejecuta diariamente, una posición abandonada puede conservarse físicamente hasta 48 h; se oculta al invitado después de 24 h y se borra inmediatamente al cancelar/entregar. Verificar primera ejecución y alertar si cron falla. Alternativa self-host/Supabase Cron: programar la misma función con credencial de servicio en gestor seguro.
No se guarda un historial de rutas: solo la última posición de la asignación. El público solo la consulta durante entrega activa con token autorizado.

## 5. Aceptación antes del piloto
Ejecutar TESTING.md con dos cuentas/roles y una compra real de prueba controlada; backups y rollback de versión aplicables. Probar teléfono físico con GPS denegado, pérdida de red, cambio a navegación y pantalla bloqueada. No prometer segundo plano por ser PWA. Si es requisito, usar app móvil driver antes del piloto operativo.
No generar ventas/direcciones reales en el entorno de demo. No presentar el negocio ficticio como comercio abierto.
