# Seguridad
## Actual
Fase 1 no almacena datos, no autentica usuarios y no expone operaciones privadas. /admin y /driver son páginas públicas de preparación, no paneles operativos. Sin secretos ni conexiones a producción.
## Criterios de Fase 2 y siguientes
Autenticación admin/driver; membresía y rol por restaurante, RLS y pruebas negativas de roles y aislamiento entre instalaciones. No confiar en precios, ids de tenant ni roles enviados por navegador. Zod en endpoints; funciones transaccionales con permisos mínimos y search_path seguro.
Invitados: token aleatorio de al menos 256 bits, hash en base, vigencia/revocación y respuesta pública mínima. Evitar filtración en logs/Referer. Nunca publicar direcciones/teléfonos/ubicaciones en canales abiertos. Rate limiting compartido y verificable, no contador en memoria de instancia serverless. Idempotencia en checkout y concurrencia en despacho.
Realtime privado requiere autorización equivalente a HTTP. Limitar lectura de ubicación al pedido activo; ubicación última vs historial con retención definida antes de Fase 6. Código entrega con hash y límite de intentos.
Separar desarrollo/producción; secretos servidor en gestor del hosting. Nunca NEXT_PUBLIC_ para claves privilegiadas. No imprimir sesiones ni tokens. Evaluar CSRF/origin según cookies y estrategia de endpoints en Fase 2.
