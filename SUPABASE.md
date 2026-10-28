# Supabase — instalación por restaurante
## Desarrollo local
Requiere Node 24 y Docker. `npm ci`, `npm run db:start`, `npm run db:reset`.
`db:reset` solo actúa sobre Supabase LOCAL: reconstruye datos locales, no lo uses si necesitas conservarlos. Para aplicar migraciones sin reiniciar una instancia local existente: `npx supabase migration up --local`.
El inicio carga las migraciones y el seed de Café Aurora. Auth público cerrado; no hay cuentas demo con contraseñas predecibles. CLI `supabase status` muestra claves locales: no compartir su salida ni capturarla en logs públicos.
Copiar .env.example a .env.local y configurar URL y publishable key de esa instancia. Nunca poner service_role/secret bajo NEXT_PUBLIC_. El proyecto de pruebas PostgreSQL usa credencial aleatoria, puerto loopback y contenedor efímero separado, sin tocar datos locales de desarrollo.

## Alta de empleados
Crear el usuario en Supabase Auth desde una consola administrativa confiable, sin habilitar autorregistro. El trigger crea profiles; no crea permisos.
Después, con NEXT_PUBLIC_SUPABASE_URL y SUPABASE_SECRET_KEY configuradas solo en el entorno de administración:
`node --env-file=.env.local scripts/provision-member.mjs <restaurant-uuid> <auth-user-uuid> owner`
Roles: owner, staff o driver. Para driver añadir como cuarto argumento el UUID del perfil Carlos/Andrea creado por seed. Script no muestra claves, no crea contraseñas, no manda emails. La función SQL valida y asigna en una transacción.
El owner se aprovisiona fuera del flujo público. No subir .env.local a GitHub.

## Proyecto cloud
Aún no vinculado. Crear un proyecto Supabase de desarrollo dedicado al negocio, configurar Auth (autorregistro cerrado, URLs exactas), aplicar migraciones con CLI vinculada y revisar grants/RLS. Seed únicamente en demo. Después configurar URL/clave pública en Next.js. El código no necesita ni usa secret key para operaciones normales de empleados: las sesiones y RLS deciden permisos.
No usar el proyecto NanBites ni CYBR VIEW. Cada negocio tendrá datos y secretos independientes. Producción tendrá otro entorno, backups y migraciones versionadas.

## Verificaciones
`npm run test:db`: Docker + PostgreSQL/PostGIS real con contrato auth.uid()/roles y tablas mínimas Storage/Auth de pruebas. No afirma verificar los servicios HTTP completos.
`node scripts/test-supabase-local.mjs`: requiere Supabase local completo; verifica Auth real, PostgREST, Storage, RLS y provisión. Credenciales CLI solo en memoria; crea usuarios temporales confirmados con contraseñas aleatorias, sin enviar email, y los elimina al terminar.

## Limitación observada en este entorno
El Docker del entorno usa almacenamiento con alto coste durante descompresión. El inicio completo de Supabase alcanzó 96% del disco y se canceló antes de arrancar servicios. Las pruebas PostgreSQL/PostGIS se ejecutaron aparte correctamente. Para certificar Auth/Storage HTTP, iniciar en máquina con suficiente disco y correr `npm run test:supabase`. No se creó ni configuró un proyecto Supabase cloud.
