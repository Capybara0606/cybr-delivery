# CYBR DELIVERY

[![Verify CYBR DELIVERY](https://github.com/Capybara0606/cybr-delivery/actions/workflows/ci.yml/badge.svg)](https://github.com/Capybara0606/cybr-delivery/actions/workflows/ci.yml)
Delivery propio para restaurantes de El Salvador. Proyecto nuevo, independiente de NanBites y CYBR VIEW. Un mismo motor para plataformas independientes: cada restaurante recibe su despliegue, base de datos y diseño. No hay marketplace ni catálogo de negocios.

## Estado
Fase 2 completada: esquema Supabase/PostGIS, RLS, seed demo, provisión de empleados y pruebas de integración SQL + Auth/Storage reales superadas en CI. Rutas de UI siguen siendo preparación, no una tienda operativa.
No hay checkout, pedidos desde interfaz, ventas ni GPS. No se ha desplegado el sitio.

## Ejecutar
Node 24 LTS y npm. `npm ci`, `npm run dev`; abrir http://localhost:3000.
`npm run check` verifica tipos y lint. `npm run build` genera producción. `npm start` sirve producción.
La UI arranca sin credenciales e informa que no hay backend configurado. Consulta SUPABASE.md para iniciar el backend local, configurar .env.local y dar de alta empleados. `npm test` ejecuta validaciones unitarias; `npm run test:db` levanta un contenedor de pruebas aislado y lo elimina al finalizar.

## Documentación
PROGRESS.md: estado y aceptación. ARCHITECTURE.md: diseño. DECISIONS.md: decisiones. RESEARCH.md: fuentes y licencias. DESIGN.md: identidad. DATABASE.md, SECURITY.md, TESTING.md y DEPLOYMENT.md: contratos y evolución.

## Escenario
Café Aurora es ficticio: una sucursal, 12 productos, Carlos y Andrea, USD, entrega en radio de 3 km y tarifa de $2, efectivo contra entrega. Son parámetros previstos, no datos operativos existentes.

## Repositorio
https://github.com/Capybara0606/cybr-delivery — motor común; instalación/base/tema independientes por restaurante. No incluye credenciales ni una licencia abierta concedida automáticamente por ser visible.
