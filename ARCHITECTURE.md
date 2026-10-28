# Arquitectura
## Alcance actual
Aplicación Next.js App Router/TypeScript: tienda `/`, seguimiento `/track`, administración `/admin` y repartidores `/driver`. Interfaces consumen APIs y datos reales de Supabase; sin configuración muestran un estado explícito y no inventan pedidos/ventas. CSS con tokens CYBR y Tailwind. Manifiestos separados para cliente y driver; offline sin datos privados. Arquitectura lista para instalaciones independientes.

## Arquitectura objetivo
Navegadores cliente/admin/repartidor -> Next.js (validación y endpoints) -> Supabase PostgreSQL/Auth/Storage/Realtime + PostGIS.
El navegador no decide precios, roles ni estados. Endpoints llaman operaciones PostgreSQL transaccionales. Roles y pertenencia al restaurante verificados en servidor y RLS. Las claves de servicio, si se necesitan, permanecen en servidor y no sustituyen comprobaciones de autorización.

## Módulos del motor
- `catalog`: categorías, productos y modificadores por restaurante.
- `checkout`: invitado, dirección, cobertura, snapshots, precio servidor e idempotencia.
- `orders`: máquina de estados e historial inmutable.
- `dispatch`: asignación exclusiva y aceptación del repartidor; una entrega activa por conductor inicialmente.
- `tracking`: token de pedido, ubicación actual autorizada, frescura y retención.
- `identity`: miembros owner/staff/driver, sesiones y aislamiento por restaurante.
- `settings`: horario, radio, tarifa, identidad comercial.

## Producto e instalaciones independientes
CYBR DELIVERY es un motor reutilizable para producir plataformas propias de restaurantes. No es marketplace ni una consola compartida para descubrir o administrar negocios clientes.
Modelo inicial: un despliegue de aplicación y un proyecto Supabase independiente por negocio. Un mismo repositorio del motor, con configuración de marca/negocio y migraciones versionadas; no crear forks divergentes ni duplicar reglas de pedidos por cliente.
`restaurant_id` mantiene relaciones internas explícitas, pero no obliga a ofrecer un SaaS multiempresa compartido. Las pruebas de aislamiento usarán instalaciones/configuraciones separadas y comprobarán que credenciales/datos no se mezclen. Miembros owner/staff/driver pertenecen únicamente al restaurante de esa instalación.

## Separación de motor y presentación
- Motor: catálogo, checkout, precios, cobertura, estados, despacho, seguimiento y permisos. Compartido sin lógica condicional por nombre de restaurante.
- Configuración de negocio: nombre, ubicación, moneda, horario, cobertura, tarifa y contactos.
- Diseño: tokens semánticos, tipografía, logotipos, imágenes y componentes/layouts reemplazables. Personalizaciones más profundas pueden tener un tema propio con el mismo contrato del motor.
- CYBR es la dirección visual del primer MVP, no una marca obligatoria en las plataformas finales. Café Aurora es el negocio ficticio del piloto.
- Futuras actualizaciones del motor deben aplicarse a cada instalación con migraciones y versión identificable; despliegues y secretos independientes.

## GPS
PWA para prueba con pantalla abierta, sin promesas en segundo plano. Abrir navegación externa puede suspender GPS. Autorización privada también en Realtime; nunca canal público con coordenadas. Publicar aproximadamente cada 5 s solo si hay nueva posición válida; guardar precisión, hora del dispositivo y recepción servidor. Rechazar posiciones fuera de rango, antiguas o no autorizadas. Mostrar última actualización y conexión; detener al finalizar. Si el piloto exige navegación externa y pantalla bloqueada con seguimiento, evolucionar interfaz driver a app móvil antes de operación.

## Límites
Vercel se usará para HTTP; no mantener WebSockets propios ni workers persistentes allí. Supabase gestiona suscripciones. Seleccionar proveedor de teselas/geocodificación con condiciones de uso compatibles; MapLibre es renderizador y no incluye ese servicio.

## Fundación de datos implementada (Fase 2)
Ver DATABASE.md y SUPABASE.md. Ocho migraciones y un seed versionados; permisos explícitos, trigger perfil Auth, roles owner/staff/driver y funciones transaccionales. Clientes SSR con cookies/getUser para APIs privadas. Checkout invitado y Realtime operativo verificados en CI.

## Aplicación funcional (fases 3–8)
/ tienda cliente -> /api/catalog y /api/orders. /track extrae token del fragmento y consulta /api/tracking con POST. /admin y /driver autentican empleados mediante /api/session y operan sus APIs de rol con cookies SSR/getUser.
Páginas de presentación no renderizan listas falsas sin backend: el menú se obtiene de PostgreSQL y muestra configuración pendiente si falta conexión.
Supabase maneja persistencia, reglas transaccionales, RLS, Auth, Storage y eventos Realtime. Next.js contiene validación HTTP, límite de cuerpo/origen, límites persistidos y secretos HMAC. MapLibre y Geolocation API en cliente; worker explícito servido desde la instalación.
PWA /manifest.webmanifest + /sw.js: fallback offline genérico, sin caché de datos privados. Sitio preparado para Vercel; no se registró Site ni se adaptó a otro runtime al elegir el usuario dejar despliegue pendiente.
