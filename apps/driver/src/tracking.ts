import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import * as SecureStore from 'expo-secure-store';
import { backend, workspace } from './backend';
import { canTrack, validPosition } from './domain/delivery';

export const TRACKING_TASK = 'cybr-active-delivery-location';
const assignmentKey = 'cybr.tracking.assignment';
const statusKey = 'cybr.tracking.status';
export async function stopTracking() {
  await SecureStore.deleteItemAsync(assignmentKey);
  if (await Location.hasStartedLocationUpdatesAsync(TRACKING_TASK))
    await Location.stopLocationUpdatesAsync(TRACKING_TASK);
}
export async function trackingStatus() {
  return {
    enabled: await Location.hasStartedLocationUpdatesAsync(TRACKING_TASK),
    message: await SecureStore.getItemAsync(statusKey) || 'GPS aún no iniciado.',
  };
}
TaskManager.defineTask<{ locations: Location.LocationObject[] }>(TRACKING_TASK, async ({ data, error }) => {
  if (error) {
    await SecureStore.setItemAsync(statusKey, 'El sistema no pudo obtener GPS. Abre la app y revisa los permisos.');
    return;
  }
  const assignment = await SecureStore.getItemAsync(assignmentKey);
  if (!assignment) { await stopTracking(); return; }
  try {
    // Do not trust a persisted assignment after cancellation/reassignment/logout.
    const current = await workspace();
    if (!canTrack(current.active) || current.active?.assignment_id !== assignment) {
      await stopTracking();
      await SecureStore.setItemAsync(statusKey, 'GPS detenido: no hay una entrega activa autorizada.');
      return;
    }
    const latest = data?.locations?.slice().sort((a, b) => b.timestamp - a.timestamp)[0];
    if (!latest || !validPosition(latest.coords.latitude, latest.coords.longitude, latest.coords.accuracy, latest.timestamp)) {
      await SecureStore.setItemAsync(statusKey, 'Esperando una posición reciente con mejor precisión.');
      return;
    }
    const { error: sendError } = await backend().rpc('publish_driver_location', {
      p_assignment: assignment, p_lat: latest.coords.latitude, p_lng: latest.coords.longitude,
      p_accuracy: latest.coords.accuracy, p_recorded_at: new Date(latest.timestamp).toISOString(), p_simulated: false,
    });
    if (sendError) {
      if (sendError.code === '42501') await stopTracking();
      throw new Error('No se pudo publicar GPS. Comprueba conexión y permisos.');
    }
    await SecureStore.setItemAsync(statusKey, `GPS enviado a las ${new Date().toLocaleTimeString('es-SV')}. Precisión: ${Math.round(latest.coords.accuracy!)} m.`);
  } catch (e) {
    await SecureStore.setItemAsync(statusKey, e instanceof Error ? e.message : 'Sin conexión para publicar GPS.');
  }
});
export async function startTracking() {
  const current = await workspace();
  if (!canTrack(current.active) || !current.active) throw new Error('Primero inicia el trayecto de una entrega aceptada.');
  const foreground = await Location.requestForegroundPermissionsAsync();
  if (foreground.status !== 'granted') throw new Error('Debes permitir la ubicación precisa para compartir GPS.');
  const background = await Location.requestBackgroundPermissionsAsync();
  if (background.status !== 'granted') throw new Error('Permite ubicación siempre en los ajustes para seguir el trayecto con otra app abierta.');
  await SecureStore.setItemAsync(assignmentKey, current.active.assignment_id);
  try {
    await Location.startLocationUpdatesAsync(TRACKING_TASK, {
      accuracy: Location.Accuracy.High, timeInterval: 5000, distanceInterval: 5,
      deferredUpdatesInterval: 5000, pausesUpdatesAutomatically: false,
      showsBackgroundLocationIndicator: true,
      foregroundService: {
        notificationTitle: 'CYBR DELIVERY · entrega en curso',
        notificationBody: 'Compartiendo tu ubicación con el cliente. Detén el GPS desde la app.',
        notificationColor: '#1db954', killServiceOnDestroy: true,
      },
    });
    await SecureStore.setItemAsync(statusKey, 'GPS iniciado. Esperando la primera posición.');
  } catch (error) { await SecureStore.deleteItemAsync(assignmentKey); throw error; }
}
