# Despliegue MVP a $0

## Estado comprobado
Supabase `cybr-delivery-mvp` creado en organización CYBR (Free), región us-east-1, referencia `wpoutxcjrctxijbzdtyy`. Cotización de creación: $0/mes. API: https://wpoutxcjrctxijbzdtyy.supabase.co. Nueve migraciones y seed aplicados: 18 tablas con RLS, 12 productos, 4 categorías; recepción de pedidos cerrada. Catálogo REST verificado; pedidos privados bloqueados al anónimo.
**La web aún no está publicada.** Falta acceso a cuenta Netlify Free y configuración segura. La conexión Supabase no entrega la clave secreta de servidor ni permite configurar Auth desde las herramientas disponibles.

## Costos y límites revisados
- [Supabase Free](https://supabase.com/pricing): $0/mes, 500 MB de DB, 1 GB de Storage y 5 GB de salida; puede pausar proyectos tras una semana inactivos. Dos proyectos Free activos como máximo. No activar Pro ni add-ons.
- [Netlify Free](https://www.netlify.com/pricing/): $0, 300 créditos mensuales con límite duro. El sitio se pausa al agotarlos; no hay excedentes cobrados en Free. Admite [proyectos comerciales](https://www.netlify.com/blog/introducing-netlify-free-plan/). Usar subdominio gratuito netlify.app; no comprar dominio. Builds de producción, tráfico y cómputo consumen la cuota compartida; consultar tarifas actuales, no prometer tráfico ilimitado.
- [Vercel Hobby](https://vercel.com/docs/plans/hobby) restringe uso a proyectos personales no comerciales; no es la opción elegida para este producto.
- OpenFreeMap con atribución OSM/OpenMapTiles, sin geocodificación ni servicios SMS/pagos. Revisar condiciones y disponibilidad antes de operación. No introducir integraciones de pago en el piloto.

## 1. Configuración Supabase pendiente
Abrir https://supabase.com/dashboard/project/wpoutxcjrctxijbzdtyy.
En Auth desactivar **Allow new users to sign up**, manteniendo email/password habilitado. Verificado: el proyecto recién creado dejó signup abierto; el config.toml local NO cambia Auth cloud. Después de tener URL web, establecer Site URL y redirects exactos, sin comodines innecesarios.
Crear cuentas owner/staff/driver privadas y provisionar membresías según SUPABASE.md. No inventar contraseñas compartidas. Mantener recepción cerrada hasta validar login/permisos y el flujo completo en HTTPS.
Obtener Publishable key y Secret key desde API Keys. Secret key solo en variables privadas de servidor, nunca en código, frontend ni chat.
No volver a aplicar seed sobre catálogo real: puede actualizar precios demo. Historial cloud alineado a las nueve versiones locales; revisar `supabase migration list` antes de `db push`.

## 2. Publicar Next.js en Netlify Free
Crear cuenta/equipo **Free**, importar Capybara0606/cybr-delivery desde GitHub, rama main. netlify.toml declara Node 24, publish .next y build con validación previa. Netlify detecta Next y configura su [adaptador OpenNext](https://docs.netlify.com/build/frameworks/framework-setup-guides/nextjs/overview/); no usar static export porque hay SSR/API privadas.
Configurar variables ANTES del primer build en Environment variables, disponibles a Build y Functions:

| Variable | Valor/configuración |
|---|---|
| NEXT_PUBLIC_SUPABASE_URL | https://wpoutxcjrctxijbzdtyy.supabase.co |
| NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY | Publishable key de este proyecto |
| SUPABASE_SECRET_KEY | Secret key de este proyecto; secreta, solo servidor |
| RESTAURANT_ID | a0000000-0000-4000-8000-000000000001 |
| ORDER_TOKEN_SECRET | Generar al menos 32 caracteres aleatorios; secreto estable |
| CRON_SECRET | Otro secreto aleatorio de al menos 32 caracteres |
| TRUST_PROXY | netlify |
| NEXT_PUBLIC_RESTAURANT_NAME | Café Aurora |
| NEXT_PUBLIC_ENABLE_GPS_SIMULATION | false |

Marcar secretos en el gestor del proveedor, sin pegarlos en chat ni Git. Generar secretos con gestor seguro o `openssl rand -hex 32` en máquina propia. ORDER_TOKEN_SECRET debe conservarse: deriva tokens/códigos para reintentos de pedidos activos. No publicar con variables vacías: el preflight bloquea ese build.
TRUST_PROXY=netlify usa únicamente el header de conexión del proveedor. No confiar en X-Forwarded-For arbitrario.
Primera publicación: verificar URL HTTPS, menú, login y flujo autorizado completo. Solo entonces comunicar URL como funcional. No existe despliegue Netlify verificado todavía.

## 3. Retención y cron
`netlify/functions/cleanup-delivery.mjs` ejecuta cleanup_delivery_data diariamente a 00:00 UTC con clave secreta de servidor. La función programada no admite invocación HTTP pública en Netlify. Verificar primera ejecución/logs en producción; los cron no se ejecutan periódicamente en local ni previews. Consumen cuota Free: si el sitio se pausa también se interrumpe mantenimiento.
La RPC elimina posiciones sin actualizar de más de 24 h y contadores de más de 2 días. Con ejecución diaria, una posición abandonada puede conservarse físicamente hasta 48 h; se oculta al invitado después de 24 h y se elimina inmediatamente al entregar/cancelar. No hay historial de rutas. `vercel.json` permanece como configuración alternativa, no se usa en Netlify.

## 4. Aceptación antes de piloto
Ejecutar TESTING.md, revisar Auth cerrado y membresías, cron y cuota. Confirmar anonimato: catálogo público, pedidos privados inaccesibles sin autorización. Supabase advisors advierte SECURITY DEFINER de funciones deliberadamente expuestas: revisar controles internos documentados, no deshabilitar RLS.
Probar en Android/iPhone real: permiso denegado, red perdida, navegación y bloqueo. Una PWA no garantiza GPS en segundo plano. No usar pedidos/direcciones reales en demo ni presentar Café Aurora como comercio abierto. Plan Free no incluye garantías de disponibilidad ni reemplaza copias de seguridad antes de operación real.
