# CYBR DELIVERY
Delivery propio para restaurantes de El Salvador. Proyecto nuevo, independiente de NanBites y CYBR VIEW. Un mismo motor para plataformas independientes: cada restaurante recibe su despliegue, base de datos y diseño. No hay marketplace ni catálogo de negocios.

## Estado
Fase 1: base técnica y visual. Rutas `/`, `/admin`, `/driver` y `/api/health`.
No hay catálogo conectado, login, pedidos, ventas ni GPS. Las páginas de operación muestran explícitamente su preparación. No se ha desplegado.

## Ejecutar
Node 24 LTS y npm. `npm ci`, `npm run dev`; abrir http://localhost:3000.
`npm run check` verifica tipos y lint. `npm run build` genera producción. `npm start` sirve producción.
No se necesitan credenciales para la Fase 1. `.env.example` reserva configuración de Supabase para la Fase 2.

## Documentación
PROGRESS.md: estado y aceptación. ARCHITECTURE.md: diseño. DECISIONS.md: decisiones. RESEARCH.md: fuentes y licencias. DESIGN.md: identidad. DATABASE.md, SECURITY.md, TESTING.md y DEPLOYMENT.md: contratos y evolución.

## Escenario
Café Aurora es ficticio: una sucursal, 12 productos, Carlos y Andrea, USD, entrega en radio de 3 km y tarifa de $2, efectivo contra entrega. Son parámetros previstos, no datos operativos existentes.
