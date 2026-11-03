# Plan: ubicación del turno en administración

Estado: el usuario autorizó implementar el plan. RPC, API y panel Flota implementados con los límites descritos abajo; ver PROGRESS.md para pruebas y despliegue. No hay API de acceso anónimo.

## Base implementada
App Android comparte automáticamente durante turno activo, con permisos precisos/segundo plano, aviso del sistema y control al cerrar turno/sesión. Última posición en private.driver_shift_locations, sin historial ni publicación Realtime ni permisos SELECT de anon/authenticated. Solo RPC autenticada de escritura para el propio driver con turno activo, membresía actual, coordenadas válidas, precisión y hora reciente/monótona.
La ubicación que ve el cliente sigue siendo exclusivamente la de su asignación aceptada en camino mediante token privado. Al entregar/cancelar se borra esa posición; el turno privado puede continuar. Cerrar turno elimina ambas posiciones en la misma transacción; publicación y cierre sincronizan en driver para impedir escrituras tardías fuera de turno.

## Implementación autorizada
1. RPC staff_shift_locations(restaurante) con comprobación de owner/staff y restaurante, nunca user_metadata. Consulta privada unida a drivers y membresías actuales. Devuelve solo nombre del driver, coordenadas, precisión, hora de recepción y disponibilidad/entrega activa. No teléfonos, códigos ni tokens de pedido. Datos no reutilizables para descubrir repartidores de otras instalaciones.
2. GET /api/admin/fleet-locations, autenticación servidor getUser y rol/restaurante; Cache-Control no-store. Sin SELECT directo de tabla privada para el navegador.
3. Panel Flota: mapa MapLibre/OpenFreeMap y lista alternativa si WebGL falla. Pines por repartidor, precisión y última actualización visibles, estados reciente (<30 s) y señal atrasada; ocultar posición como operativa después de 90 s sin recepción y al cerrar turno. Nunca mostrar un GPS antiguo como si fuese en vivo. Actualizar cada 10 s solo mientras la pestaña esté visible; empezar con polling, sin nuevo servicio pagado ni canal abierto.
4. Pruebas DB/API: driver, invitado y staff ajeno rechazados; owner/staff correctos ven únicamente su instalación; cerrar turno/revocar rol corta visibilidad; posición caducada no se presenta como actual; cliente nunca consulta GPS de turno. Añadir flujo de panel con dos cuentas y permisos reales.
5. Ensayo Android físico al menos cinco minutos: sin pedido, entrega, navegación externa, bloqueo de pantalla, fin de entrega manteniendo turno, cierre de turno, logout, sin red, permisos denegados y cierre forzado. La app no garantiza continuidad si Android la mata y no debe dibujar posiciones inventadas.

## Retención/costos
Solo última posición por driver, sin ruta histórica. Borrado inmediato al cerrar turno confirmado; si el dispositivo queda offline/forzado sin poder cerrar el turno servidor, la posición deja de considerarse actual y cron elimina filas abandonadas de más de 24 h (hasta 48 h físicos con cron diario). Mantener comprobación de la ejecución del cron. Sin servicio de pago adicional: mismo Supabase Free, Netlify Free y proveedor actual de mapas; vigilar cuotas de lectura/egreso.

RPC/API/panel implementados; aceptación física y resultado final de CI/despliegue se registran en PROGRESS.md.
