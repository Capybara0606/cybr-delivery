# Decisiones
- ADR-001: nuevo repo Next.js, no migrar NanBites. El producto es web white-label, invitado y reutilizable por negocio; NanBites es móvil y requiere rehacer operaciones críticas.
- ADR-002: identidad CYBR reemplaza la paleta crema del prompt original por instrucción posterior del usuario. Conservar configuración futura de marca por restaurante.
- ADR-003: Supabase/PostGIS previsto. No crear infraestructura remota sin avanzar a fase 2; la base debe arrancar sin secretos.
- ADR-004: PWA driver para demo controlada con GPS en primer plano. App nativa si el piloto exige continuidad al navegar/bloquear.
- ADR-005: Next.js/React/TypeScript y Tailwind para UI; lucide-react para iconos. No añadir librería de formularios, shadcn ni SDK de mapas hasta que haya un caso real.
- ADR-006: una entrega activa por repartidor. Dos administradores compiten mediante bloqueo/transacción y restricción en DB, nunca solo botón deshabilitado.
- ADR-007: asignación ofrecida y aceptación se registran en driver_assignments. Llegada es evento, no nuevo estado. Caducidad/rechazo devuelve pedido a ready_for_pickup según operación transaccional; cancelar termina asignación y corta acceso GPS.
- ADR-008: radio geodésico en línea recta, no distancia vial. Dinero en centavos enteros; tarifa inicial 200 centavos.
- ADR-009: Fase 1 local; despliegue reservado a fase 8. No modificar repositorios fuente.

- ADR-010 (corrección del usuario): mismo motor, plataformas independientes y distinto diseño por restaurante. Un despliegue y Supabase por negocio inicialmente. No SaaS multiempresa compartido ni marketplace. Esta decisión sustituye cualquier propuesta previa de base compartida/tenant por slug. Configuración y tema separados de reglas de negocio, sin forks divergentes.
