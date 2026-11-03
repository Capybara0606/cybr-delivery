import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import * as SecureStore from 'expo-secure-store';
import { backend, workspace, DriverAccessError } from './backend';
import { canTrack, canShareShift, validPosition } from './domain/delivery';

// Keep the task identifier stable so updating the APK replaces the old handler.
export const TRACKING_TASK = 'cybr-active-delivery-location';
const driverKey = 'cybr.tracking.driver';
const statusKey = 'cybr.tracking.status';
const modeKey = 'cybr.tracking.mode';
let generation = 0;
let sending = false;
let starting: Promise<void> | null = null;
export async function stopTracking() {
  generation++;
  await SecureStore.deleteItemAsync(driverKey);
  await SecureStore.deleteItemAsync(modeKey);
  await SecureStore.deleteItemAsync('cybr.tracking.assignment');
  if (await Location.hasStartedLocationUpdatesAsync(TRACKING_TASK))
    await Location.stopLocationUpdatesAsync(TRACKING_TASK);
  await SecureStore.setItemAsync(statusKey, 'Ubicación detenida.');
}
export async function trackingStatus() {
  return {
    enabled: await Location.hasStartedLocationUpdatesAsync(TRACKING_TASK),
    message: await SecureStore.getItemAsync(statusKey) || 'La ubicación se activa al iniciar tu turno.',
  };
}
TaskManager.defineTask<{ locations: Location.LocationObject[] }>(TRACKING_TASK, async ({ data, error }) => {
  if (sending) return;
  sending = true;
  try {
    if (error) throw new Error('No se pudo obtener GPS. Abre la app y revisa permisos y batería.');
    const driver = await SecureStore.getItemAsync(driverKey);
    if (!driver) { await stopTracking(); return; }
    const current = await workspace();
    if (!canShareShift(current) || current.driver.id !== driver) { await stopTracking(); return; }
    const latest = data?.locations?.slice().sort((a, b) => b.timestamp - a.timestamp)[0];
    if (!latest || !validPosition(latest.coords.latitude, latest.coords.longitude, latest.coords.accuracy, latest.timestamp))
      throw new Error('Esperando una posición reciente con mejor precisión.');
    const position = { p_lat: latest.coords.latitude, p_lng: latest.coords.longitude,
      p_accuracy: latest.coords.accuracy, p_recorded_at: new Date(latest.timestamp).toISOString() };
    // Private shift position: never exposed to a customer without an active trip.
    const { error: shiftError } = await backend().rpc('publish_shift_location', position);
    if (shiftError) {
      if (shiftError.code === '42501') await stopTracking();
      throw new Error('No se pudo publicar ubicación del turno. Revisa conexión y disponibilidad.');
    }
    if (canTrack(current.active) && current.active) {
      const { error: tripError } = await backend().rpc('publish_driver_location', {
        ...position, p_assignment: current.active.assignment_id, p_simulated: false,
      });
      // Cancellation/completion between reads is normal: DB rejects the old trip.
      if (tripError && tripError.code !== '42501')
        throw new Error('Ubicación del turno enviada; no se pudo actualizar el seguimiento de esta entrega.');
    }
    await SecureStore.setItemAsync(statusKey, `Último envío: ${new Date().toLocaleTimeString('es-SV')}. Precisión: ${Math.round(latest.coords.accuracy!)} m.`);
  } catch (e) {
    if (e instanceof DriverAccessError) await stopTracking();
    await SecureStore.setItemAsync(statusKey, e instanceof Error ? e.message : 'Sin conexión para publicar ubicación.');
  } finally { sending = false; }
});
export async function requestTrackingPermissions() {
  const foreground = await Location.requestForegroundPermissionsAsync();
  if (foreground.status !== 'granted') throw new Error('Permite ubicación precisa para iniciar el turno.');
  const background = await Location.requestBackgroundPermissionsAsync();
  if (background.status !== 'granted') throw new Error('Permite ubicación siempre en Ajustes para compartir durante tu turno con otra app abierta.');
}
export async function startTracking(requestPermissions = true): Promise<void> {
  if (starting) {
    try { await starting; return; }
    catch (error) { if (!requestPermissions) throw error; }
  }
  const attempt = beginTracking(requestPermissions);
  starting = attempt;
  try { await attempt; }
  finally { if (starting === attempt) starting = null; }
}
async function beginTracking(requestPermissions: boolean) {
  const startedGeneration = generation;
  if (requestPermissions) await requestTrackingPermissions();
  else {
    const foreground = await Location.getForegroundPermissionsAsync();
    const background = await Location.getBackgroundPermissionsAsync();
    if (!foreground.granted || !background.granted) throw new Error('El turno necesita permisos de ubicación. Pulsa Reintentar GPS.');
  }
  const current = await workspace();
  if (!canShareShift(current)) throw new Error('Inicia tu turno para compartir ubicación.');
  if (startedGeneration !== generation) return;
  await SecureStore.setItemAsync(driverKey, current.driver.id);
  if (await Location.hasStartedLocationUpdatesAsync(TRACKING_TASK)) {
    if (await SecureStore.getItemAsync(modeKey) === 'shift-v2') return;
    await Location.stopLocationUpdatesAsync(TRACKING_TASK);
  }
  try {
    await Location.startLocationUpdatesAsync(TRACKING_TASK, {
      accuracy: Location.Accuracy.High, timeInterval: 10000, distanceInterval: 0,
      deferredUpdatesInterval: 10000, pausesUpdatesAutomatically: false,
      showsBackgroundLocationIndicator: true,
      foregroundService: {
        notificationTitle: 'CYBR DELIVERY · turno activo',
        notificationBody: 'Compartiendo ubicación durante tu turno. Para detenerla, cierra el turno o la sesión.',
        notificationColor: '#1db954', killServiceOnDestroy: true,
      },
    });
    if (startedGeneration !== generation) { await stopTracking(); return; }
    await SecureStore.setItemAsync(modeKey, 'shift-v2');
    await SecureStore.setItemAsync(statusKey, 'Ubicación automática del turno iniciada. Esperando GPS.');
  } catch (error) { await SecureStore.deleteItemAsync(driverKey); throw error; }
}
