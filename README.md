# CYBR DELIVERY

[![Verify CYBR DELIVERY](https://github.com/Capybara0606/cybr-delivery/actions/workflows/ci.yml/badge.svg)](https://github.com/Capybara0606/cybr-delivery/actions/workflows/ci.yml)

Motor de delivery propio para plataformas independientes de restaurantes. Una instalación y base Supabase por negocio; configuración y diseño separados del motor. No es marketplace.

## Implementado
- Tienda responsive, menú/opciones desde PostgreSQL, carrito local y checkout invitado contra entrega.
- Precios en centavos calculados en DB, horarios, cobertura PostGIS, snapshots, operación transaccional e idempotencia.
- Seguimiento privado por token en fragmento URL, estados y última ubicación autorizada/fecha/precisión.
- Login de empleados, panel Kanban, historial/detalle, CRUD de productos/categorías, imágenes, horarios/tarifa/radio, flota y métricas reales.
- Realtime de eventos sin PII con RLS, respaldo de actualización y sonido activado por gesto del usuario.
- Repartidor: turno, aceptar/rechazar, recogida/salida/llegada, navegación externa, GPS de primer plano y entrega con código (5 intentos), pago cobrado y liberación de asignación.
- PWA con manifiesto/iconos y pantalla offline genérica. No confirma operaciones ni cachea pedidos/datos privados sin conexión.

## Escenario de demo
Café Aurora (ficticio), San Salvador, 4 categorías, 12 productos, Carlos/Andrea, USD, efectivo, radio 3 km y envío $2. Fotos generadas/representativas, no un restaurante real. Seed deja recepción cerrada y no crea contraseñas compartidas.

## Ejecutar
Node 24 y Docker para Supabase local. `npm ci`, `npm run db:start`. Configurar `.env.local` a partir de `.env.example` con URL/clave pública y secretos privados de servidor. Generar ORDER_TOKEN_SECRET y CRON_SECRET estables con un gestor seguro, al menos 32 caracteres. Nunca versionar `.env.local` ni pegar secretos en frontend.
Crear empleados Auth y asignar membresía con SUPABASE.md. `npm run dev`; abrir http://localhost:3000. Sin backend configurado, la tienda muestra una preparación explícita y no acepta pedidos ficticios.
En este entorno Supabase completo excedió el disco; se verificó con stack real efímero en GitHub Actions.

## Verificar
`npm run check` — TypeScript y ESLint.
`npm run test:db` — PostgreSQL/PostGIS real, contenedor efímero y unitarias.
`npm run test:supabase` — Auth/PostgREST/Storage reales (requiere Supabase local).
`npx playwright install --with-deps chromium` y `npm run test:flow` — tres sesiones sobre compilación de producción, desde $11.75 de compra hasta venta entregada; datos y empleados temporales. Solo stack local, nunca una base remota.
`npm run build` — producción. `npm run deploy:check` — preflight sin publicar ni mostrar valores.

## Estado de publicación
Código publicado en https://github.com/Capybara0606/cybr-delivery. El usuario pidió dejar el despliegue preparado: no se creó proyecto Supabase cloud ni se publicó sitio. Vercel y Supabase listos para configurar siguiendo DEPLOYMENT.md.
GPS validado con emulación del navegador, no certificado en teléfono físico. Una PWA no garantiza seguimiento con otra app abierta o teléfono bloqueado.

## Documentación
PROGRESS.md, ARCHITECTURE.md, DECISIONS.md, DATABASE.md, SECURITY.md, TESTING.md, DEPLOYMENT.md, SUPABASE.md y CUSTOMIZATION.md.
