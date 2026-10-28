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

## Fronteras implementadas en fases 3–8
API de checkout/tracking usa service_role solo en servidor, con validación Zod estricta, límite de cuerpo 25 KB, same-origin y limitación persistida en PostgreSQL. TRUST_PROXY se configura solo para cabeceras que el hosting real sobrescribe; sin proveedor conocido se usa un límite compartido conservador, nunca se confía libremente en x-forwarded-for.
Pedidos idempotentes con hash de solicitud, HMAC secreto estable y validación/cálculo transaccionales en DB. Seguimiento por token 256-bit en fragmento, consulta POST, no-referrer, no-store y datos mínimos; no claves de recuperación internas ni hashes en respuesta. Token vence siete días. Código seis dígitos solo verificable por conductor aceptado y cinco intentos persistidos.
Estados/roles nuevamente comprobados en RPC, no confiados al navegador. Recogida/entrega por driver asignado; cobro y liberación atómicos. GPS requiere entrega activa, coordenadas/precisión/fecha válidas y no regresa a posición más antigua. Cancelar/entregar serializa con publicación y elimina posición.
Realtime usa order_events sin PII y driver_locations con RLS, no orders con hashes. Las consultas invitadas no se suscriben a canales públicos: reciben última posición autorizada por API cada cinco segundos. La marca de stale no equivale a una posición en vivo.
PWA solo cachea pantalla offline genérica e iconos. No almacena respuestas API, páginas autenticadas, dirección/teléfono ni tracking en CacheStorage. Carrito local contiene únicamente productos/opciones/cantidades; no se confirma una compra sin conexión.
Cabeceras no-referrer, nosniff, frame deny y geolocalización self. Imágenes se escriben en ruta del restaurante y sus tipos/tamaño los refuerza Storage. El servidor valida que image_path no escape del prefijo del negocio.

## Límites conocidos
No hay certificación de GPS físico ni garantía en segundo plano. Un navegador no prueba criptográficamente que las coordenadas sean de un sensor auténtico; solo autoriza actor y valida datos. Simulación explícita deshabilitada por defecto y bloqueada para negocios reales.
Supabase cloud y sitio no desplegados por elección del usuario. Configurar Auth/Realtime/secretos/cron también en el proyecto real; el archivo local no lo hace automáticamente. Mantener ORDER_TOKEN_SECRET estable durante vigencia de pedidos. Huérfanos de imágenes de un editor cancelado requieren limpieza manual futura; no contienen datos de clientes.
Separar negocios y desarrollo/producción. Los tests usan datos ficticios, usuarios y contraseñas aleatorios en memoria que se eliminan al terminar.
