# Base de datos — Fase 2
## Implementado
Cuatro migraciones SQL transaccionales: foundation (17 tablas/3 enums/PostGIS/RLS), operations (estados/auditoría/asignación/cobertura), storage (imágenes) y provisioning (alta de miembros de confianza).

## Entidades
restaurants y restaurant_settings: negocio, ubicación geográfica, USD, zona America/El_Salvador, radio, tarifa, horario y recepción de pedidos.
profiles: identidad de Auth sin rol en metadata. restaurant_members: pertenencia owner/staff/driver explícita.
categories/products/product_options/product_option_values: catálogo por negocio, precios enteros en centavos y opciones.
delivery_addresses: direcciones privadas. orders/order_items/order_item_options: datos de compra, snapshots y total calculado exacto. El cliente no tiene INSERT/UPDATE/DELETE directo.
order_status_history: historial append-only para los clientes, actor y tiempo servidor.
drivers/driver_assignments: perfiles vinculados explícitamente a Auth, ofertas/aceptación y restricciones únicas parciales (una activa por pedido y conductor).
driver_locations: última ubicación por asignación; sin endpoint de ingestión todavía. payments: efectivo pendiente/cobrado/cancelado.

## Restricciones y autorización
Todas las tablas de negocio tienen RLS. FK compuestas impiden enlazar entidades de distintos restaurantes. restaurant_id mantiene consistencia interna; cada plataforma final usa su despliegue/base propios. Las pruebas incluyen un segundo restaurante solo como fixture adversarial de integridad, no una interfaz marketplace.
UUID internos. Importes integer en centavos y rangos. Total de pedido generado por PostgreSQL, no libre. Pedido único por idempotency key + restaurante; request_hash permitirá rechazar reintentos con cuerpo distinto en Fase 3. Hash de token único; columnas hash de seguimiento/código sin permiso SELECT ni siquiera para owner/staff mediante API normal.

## RPCs
- check_delivery_coverage: público, valida coordenadas finitas/en rango y usa ST_DWithin en metros. Devuelve cobertura y tarifa, no autoriza crear pedido.
- advance_order: owner/staff, pending -> accepted -> preparing -> ready_for_pickup.
- offer_assignment: owner/staff, bloquea pedido y conductor y cambia ready_for_pickup -> assigned. Requiere conductor provisionado/disponible. Concurrencia protegida además por índices únicos.
- respond_assignment: conductor asignado acepta oferta o rechaza devolviendo el pedido a ready_for_pickup. Guarda evento.
- set_driver_availability: solo perfil propio con membresía driver, no permite editar identidad/carga.
- cancel_order: staff antes de recogida; owner después. Transacción cancela pedido, asignación/pago pendiente, borra ubicación y corta acceso del conductor.
- provision_member: únicamente service_role; usuario Auth existente, vinculación explícita y atómica. Nunca accesible a navegador.

El trigger de estados impide saltos inválidos incluso en escrituras privilegiadas y audita el cambio. delivered es terminal. Recogida, llegada, código/entrega y caducidad automática de oferta se completarán al implementar el flujo driver; todavía no hay RPC público para saltarlos.

## Seed
Idempotente, explícitamente demo: Café Aurora, ubicación ficticia en San Salvador, 4 categorías, 12 productos, modificador de leche para capuchino, Carlos/Andrea sin user_id ni contraseña, envío 200 centavos/radio 3000m. Recepción cerrada por defecto. Sin fotos externas ni pedidos inventados.
No ejecutar seed de demo en producción. No sobrescribir precios operativos con seed: es solo para un proyecto de desarrollo/demo.

## Pendiente Fase 3
Crear checkout transaccional que recalcule precios/opciones, valide horario/disponibilidad/cobertura, use idempotencia, genere hashes seguros y escriba dirección/pedido/items/pago en una sola operación. La migración NO ofrece todavía checkout público, tracking invitado ni rate limiting. No afirmar que la compra está implementada por existir sus tablas.
