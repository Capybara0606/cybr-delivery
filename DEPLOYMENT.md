# Despliegue
No desplegado en Fase 1. Objetivo Fase 8: Vercel + Supabase. Cada negocio tendrá su despliegue y proyecto Supabase propios, además de separación desarrollo/producción. Un repositorio del motor y configuración/tema por instalación; no forks divergentes. HTTPS obligatorio para geolocalización fuera de localhost.
Local: Node 24, npm ci, npm run build, npm start. No requiere secretos en Fase 1.
Antes de publicar: migraciones probadas, RLS y canales privados, variables separadas, proveedor de mapas autorizado, seed solo ficticio, no cuentas demo privilegiadas en producción, límites de consumo, retención GPS y datos personales, backups y recuperación.
Aplicar migraciones desde pipeline controlado; no desde petición pública. No alojar un servidor WebSocket persistente dentro de Vercel.
