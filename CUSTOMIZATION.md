# Mismo motor, distinto restaurante
## Qué se comparte
Reglas SQL, checkout, autorización, estados, asignaciones, seguimiento y pruebas. Mantener un repo del motor y una versión de migraciones identificable; no duplicar reglas por nombre de negocio ni crear forks que diverjan.

## Qué cambia por instalación
- Supabase dedicado y credenciales separadas (desarrollo/producción también separados).
- RESTAURANT_ID y NEXT_PUBLIC_RESTAURANT_NAME.
- Registro restaurants y restaurant_settings (ubicación, horario, contacto de recogida, tarifa, cobertura).
- Categorías/productos/opciones/imágenes en su DB/Storage. No usar seed Café Aurora en un negocio real.
- src/config/installation.ts: nombre/copy/identidad de la primera presentación.
- src/themes/cybr.css y componentes de presentación: paleta, tipografía, logo, fotografías y composición. El tema inicial sigue CYBR; otros diseños pueden reemplazar la presentación usando el mismo contrato API.
- Manifiesto/iconos/metadata del negocio en src/app/manifest.ts, layout.tsx y public/icons, además de public/offline.html para la pantalla sin conexión.

Las variables NEXT_PUBLIC_* deben configurarse antes de compilar; quedan incluidas en el bundle público. Nunca colocar secretos ahí.
El backend resuelve restaurant_id desde configuración de servidor, no desde datos del comprador. La separación de datos no depende de una selección de restaurante en UI: cada plataforma abre directamente su propio menú.
