# Seguridad — Fase 2
## Fronteras implementadas
RLS y permisos SQL explícitos para las 17 tablas. Anónimos solo leen catálogo/config pública y consultan cobertura. No leen clientes ni pedidos. Owner/staff gestionan catálogo propio; solo owner cambia ajustes. Miembros no se dan de alta ni cambian su rol directamente.
Conductor ve pedidos/items/dirección únicamente con asignación activa. Al rechazar/cancelar pierde acceso. Solo staff ve pagos; ubicaciones SQL disponibles únicamente para staff o conductor asignado mientras asignación aceptada.
No hay cliente autorizado para escribir orders, items, pagos, ubicación o historial directamente. Mutaciones de estados/asignación mediante funciones SECURITY DEFINER con search_path vacío, permisos explícitos y comprobación de auth.uid()/membresía.
Hash de seguimiento y código excluidos del SELECT de las cuentas autenticadas. Nunca emitir esos campos por Realtime. Publicaciones privadas y acceso tracking se diseñarán en Fases 4/6 antes de exponer eventos.

## Auth
Supabase Auth, clientes browser y SSR preparados. Verificación servidor con getUser, no confiar en getSession o metadata. Trigger crea perfil pero no membresía; metadata role=owner no concede privilegios. Registro público deshabilitado globalmente; proveedor email/password habilitado para cuentas administradas. Ambas condiciones comprobadas con Auth real en CI. Login UI y refresco de sesión de rutas operativas se implementarán en sus fases; /admin y /driver siguen siendo páginas públicas de preparación, sin datos privados.
provision_member requiere service_role, usuario Auth ya existente y relaciones válidas. No se crean contraseñas compartidas ni se envían invitaciones/emails automáticamente. Usar scripts/provision-member.mjs en máquina de administración confiable, nunca en frontend.

## Secretos y Storage
Configuración pública valida HTTPS (excepto localhost) y rechaza sb_secret_ y JWT con rol service_role. Clave privilegiada solo en entorno servidor/script. Ninguna credencial real versionada. Proyecto remoto no creado ni vinculado automáticamente.
Bucket product-images público solo para imágenes de producto autorizadas JPEG/PNG/WebP hasta 5MiB; rutas `<restaurant UUID>/archivo`. Escritura owner/staff de ese restaurante. No guardar direcciones, recibos ni ubicación. MIME/rango de tamaño reforzados por Storage; la prueba SQL no sustituye esa API.

## Aún no disponible
Checkout, rate limiting distribuido, validación Zod de formularios, tracking invitado, generación/verificación de código de entrega, ingestión GPS/frescura/retención y políticas Realtime. Se construirán antes de habilitar esos endpoints. No exponer datos personales por el mero hecho de tener Realtime activo en Supabase.
Separación desarrollo/producción y por negocio. Controlar ajustes Auth/Storage también en proyectos remotos: config.toml configura la instancia local, no asegura por sí solo el proyecto cloud.
