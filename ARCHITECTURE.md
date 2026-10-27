# Arquitectura
## Alcance actual
Una aplicación Next.js con App Router y componentes de servidor. `/` presenta el sistema y su alcance; `/admin` y `/driver` muestran preparación sin datos personales ni operaciones. `/api/health` informa separadamente el estado de servicios. CSS con tokens CYBR y Tailwind instalado. No hay conexiones externas en runtime de Fase 1.

## Arquitectura objetivo
Navegadores cliente/admin/repartidor -> Next.js (validación y endpoints) -> Supabase PostgreSQL/Auth/Storage/Realtime + PostGIS.
El navegador no decide precios, roles ni estados. Endpoints llaman operaciones PostgreSQL transaccionales. Roles y pertenencia al restaurante verificados en servidor y RLS. Las claves de servicio, si se necesitan, permanecen en servidor y no sustituyen comprobaciones de autorización.

## Módulos futuros
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
