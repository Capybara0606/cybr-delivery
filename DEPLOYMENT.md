# Despliegue
No desplegado en Fase 1. Objetivo Fase 8: Vercel + Supabase. Cada negocio tendrá su despliegue y proyecto Supabase propios, además de separación desarrollo/producción. Un repositorio del motor y configuración/tema por instalación; no forks divergentes. HTTPS obligatorio para geolocalización fuera de localhost.
Local: Node 24, npm ci, npm run build, npm start. No requiere secretos en Fase 1.
Antes de publicar: migraciones probadas, RLS y canales privados, variables separadas, proveedor de mapas autorizado, seed solo ficticio, no cuentas demo privilegiadas en producción, límites de consumo, retención GPS y datos personales, backups y recuperación.
Aplicar migraciones desde pipeline controlado; no desde petición pública. No alojar un servidor WebSocket persistente dentro de Vercel.

## Fase 2: código vs aplicación desplegada
Repositorio fuente: https://github.com/Capybara0606/cybr-delivery (público, creado por el usuario). Publicar código no despliega el sitio ni crea Supabase cloud.
Se incluye CI de tipos, unitarias, PostgreSQL/PostGIS real y build. Una suite DB efímera crea su propio contenedor, puerto loopback y contraseña aleatoria; no usa secretos de producción.
Proyecto cloud y despliegue de aplicación todavía pendientes. Ver SUPABASE.md para aplicar migraciones por instalación.
