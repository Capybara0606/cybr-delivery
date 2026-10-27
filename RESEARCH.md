# Investigación — 27 octubre 2026
## Método y límites
Lectura previa de NanBites y ejecución de npm/tsc/eslint/Jest. Para las cinco alternativas se verificaron metadatos GitHub, estructura raíz, README y LICENSE disponible. No se ejecutaron estas cinco aplicaciones ni se auditaron todas sus dependencias. Afirmaciones de sus README no son certificación independiente.

| Repo | Tecnología publicada | Licencia verificada | Decisión |
|---|---|---|---|
| https://github.com/enatega/food-delivery-singlevendor | React/Expo, GraphQL, panel web | MIT del código publicado; README dice API/backend propietarios de pago | No adoptar como backend independiente. Referencia de UX. |
| https://github.com/prawin-jayakhar/UrbanEats | React/Vite y Supabase, cliente/admin | LICENSE MIT | Referencia simple catálogo/pedidos; no cubre flota completa. |
| https://github.com/3cgbdg/Foodie-Hub | Next.js, Express, MongoDB, Socket.IO | LICENSE GPLv3 | Referencia conceptual de estados/seguridad; no copiar para este producto sin evaluar obligaciones. |
| https://github.com/hammtah/delivery | Next.js, Laravel, MySQL | Sin LICENSE en raíz; metadatos sin licencia | No reutilizar código sin permiso. Referencia conceptual de operación propia. |
| https://github.com/JasonTM17/FoodDelivery_App | NestJS, Next.js, Flutter, Supabase/PostGIS, Redis | LICENSE MIT | Referencia logística; demasiado stack para el primer MVP. README reconoce límites de evidencia física. |

## NanBites
https://github.com/Capybara0606/nanbites-flota commit 7adb8d9: React Native/Supabase. TypeScript 8 errores; lint 38 errores/37 warnings; seis aserciones pasan pero Jest termina con error de teardown; npm ci necesita legacy-peer-deps. RLS de order_items solo SELECT; orders sin UPDATE ni acceso driver/restaurante; checkout ignora fallo de items y vacía carrito. Sin GPS, control de roles completo ni licencia raíz identificada. No adoptar como base.

## Marca
CYBR VIEW inspeccionado únicamente como referencia de identidad por solicitud explícita del usuario. No migrar Firebase/vanilla/CEP al proyecto nuevo.

## Riesgos
Existencia o popularidad no prueban mantenimiento ni seguridad. No se copió código de alternativas. Revisar licencias de dependencias y medios antes de distribución. MapLibre no resuelve proveedor de teselas, búsqueda de direcciones ni navegación. Ninguna fuente sustituye pruebas propias de aislamiento, concurrencia y GPS real.
