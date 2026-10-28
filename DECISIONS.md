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

- ADR-011: base Fase 2 probada en PostgreSQL/PostGIS real, con suite efímera que reproduce contratos de rol/JWT, más verificación Supabase local completo cuando está disponible. Nunca confundir pruebas DB con prueba de Auth HTTP.
- ADR-012: registro público cerrado; cuentas Auth administradas y membresía mediante provision_member exclusivo service_role. Seed no crea contraseñas ni envía mensajes.
- ADR-013: pedidos/historial/pagos sin mutaciones directas para navegador. Operaciones transaccionales SECURITY DEFINER con search_path vacío; claves privilegiadas fuera de cliente.
- ADR-014: repositorio creado manualmente por usuario tras rechazo createRepository de integración. Usuario lo creó público; preservar esa visibilidad. Sitio sigue sin desplegar.

- ADR-015: usuario autorizó fases 3–8; luego eligió dejar despliegue preparado. No crear servicios cloud ni registrar Site.
- ADR-016: compra/tracking mediante API Next y RPC service-only. Tokens HMAC reproducibles para reintentos, 256 bits y fragmento URL; código derivado independiente, solo hashes en DB. Secreto estable siete días.
- ADR-017: Realtime sobre eventos sin PII/ubicaciones con RLS; invitado consulta API autorizada cada 5 s en lugar de canal anónimo.
- ADR-018: GPS solo en primer plano con consentimiento; fuente simulada etiquetada y habilitación explícita para demo. No se promete background ni certificación de sensor físico a partir de navegador emulado.
- ADR-019: PWA cachea únicamente fallback offline/iconos. No encolar pagos/entregas ni cachear información de clientes.
- ADR-020: worker MapLibre servido explícitamente desde el mismo origen para evitar resolución incorrecta del empaquetador. Licencia preservada y copiado durante instalación/build.
- ADR-021: mantenimiento diario autenticado; visibilidad pública de posición abandonada expira a 24 h, retención física hasta 48 h si cron diario funciona. Borrado inmediato en estados terminales.

## D-017 — Validación sin infraestructura pagada
Usuario autoriza cloud solo a $0. Proyecto Supabase Free dedicado, organización CYBR, cotización confirmada por herramienta. Web prevista en Netlify Free: uso comercial permitido, límite duro de créditos y pausa al agotarse; usar subdominio netlify.app sin dominio comprado. No adoptar Vercel Hobby para este producto por su restricción personal/no comercial. No contratar complementos, recargas ni upgrades. El plan gratuito limita disponibilidad: Supabase puede pausar tras una semana inactivo, Netlify al agotarse cuota.
La conexión Supabase no concede acceso a Netlify ni expone claves privadas de servidor; faltan esos accesos/configuración para publicar. No convertir el motor a otra arquitectura solo para eludir la configuración de cuentas.
