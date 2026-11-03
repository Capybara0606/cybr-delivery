# CYBR Repartidor — app nativa

Expo/React Native separado de Next, mismo Supabase por restaurante, sin WebView ni claves privilegiadas. Android primero; código compatible con iOS cuya firma/distribución física no está incluida en el compromiso $0.

## Funciones
Login con cuenta existente, turno, asignación real, aceptar/rechazar, recoger/salir/llegar, código de seis dígitos y cobro/entrega atómicos. Historial con resultado propio de asignación. Navegación externa a recogida/entrega y llamada. No incluye mapa embebido; el tracking web muestra ubicación autorizada.
GPS nativo solo durante entrega aceptada en camino, con consentimiento, permisos y servicio visible Android. Sin simulador, cola offline ni persistencia de rutas/direcciones. Comprobar asignación antes de cada envío y de nuevo en SQL. Detener al completar/cancelar, perder autorización o salir de sesión.
Sesiones SecureStore fragmentadas para límites de tamaño, disponibles tras primer desbloqueo para autenticar con pantalla bloqueada; nunca AsyncStorage. Solo ID de asignación/estado técnico GPS fuera de la sesión; sin coordenadas persistidas.

## Ejecutar
Node 24, `npm ci`, `npm run check`, `npx expo run:android` con SDK y teléfono/emulador configurados. `npx expo export --platform android` verifica bundle, sin compilar APK. Expo Go no permite verificar GPS de segundo plano: requiere app nativa.
`installation.json` es configuración pública de Café Aurora. Cambiar datos o EXPO_PUBLIC_* al compilar otra instalación y personalizar app.json (nombre/package/bundleIdentifier). Nunca poner sb_secret_, contraseñas ni ORDER_TOKEN_SECRET en APK. Reglas y permisos en Auth/RLS/RPC, no en clave pública.

## APK piloto sin EAS ni tienda
Workflow manual **Build Android driver APK**, runner estándar GitHub en repo público. Prebuild + Gradle assembleRelease, JS embebido sin Metro. Artifact `cybr-driver-android-pilot`, 7 días. Solo arm64-v8a (teléfonos Android ARM64), no emulador x86. Firma de desarrollo del template: no usar para distribución productiva; posteriormente gestionar firma privada estable fuera de Git.
Descargar APK al completar el workflow. Android puede pedir permitir instalación desde ese navegador. Sesiones/permisos del navegador no se transfieren: entrar con cuenta de repartidor y conceder permisos en app.

## Aceptación física pendiente
1. Login driver y rechazo owner; turno y asignación desde admin; aceptar/recoger/salir.
2. Compartir GPS: permitir ubicación precisa y segundo plano. Android 11+ puede abrir Ajustes. Ver notificación.
3. Abrir navegación y bloquear pantalla al menos 5 minutos, comparar tracking web/frescura/precisión y restricciones batería del fabricante. Intervalo de 5 s solicitado no es garantía del sistema.
4. Probar permisos denegados, red perdida, sesión revocada, cancelación admin y código incorrecto/correcto. No confirmar operación sin DB; no inventar posiciones. GPS detenido tras cierre de sesión/entrega, última posición borrada en DB al terminar.
5. Forzar cierre/reiniciar: no garantizar continuidad ni reinicio silencioso; volver a abrir y activar seguimiento autorizado.

Tipos, export Android y manifest prebuild verificados; APK y resultados físicos se documentan en PROGRESS.md. Background configurado no equivale a sensor físico certificado.

## Descarga piloto disponible
[Descargar APK Android ARM64](https://github.com/Capybara0606/cybr-delivery/releases/download/driver-v0.1.0-pilot/CYBR-Repartidor-0.1.0-arm64.apk) · 22 MB.
[Prerrelease y fuente exacta](https://github.com/Capybara0606/cybr-delivery/releases/tag/driver-v0.1.0-pilot). Compilación y firma v2 verificadas, prueba física pendiente. No requiere cuenta Expo, PC ni servicios pagados para instalar.
