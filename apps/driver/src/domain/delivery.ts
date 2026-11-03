export type Point = { lat: number; lng: number };
export type Delivery = {
  id: string; assignment_id: string; assignment_status: string; order_number: number;
  status: string; customer_name: string; customer_phone: string; total_cents: number;
  address: string; instructions: string; destination: Point; pickup: Point;
  pickup_address: string; items: { name: string; quantity: number }[];
};
export type Workspace = {
  driver: { id: string; full_name: string; is_available: boolean };
  active: Delivery | null;
  history: { order_number: number; assignment_status: string; total_cents: number }[];
};
export function canTrack(active: Delivery | null) {
  return active?.assignment_status === 'accepted' && active.status === 'on_the_way';
}
export function validPosition(latitude: number, longitude: number, accuracy: number | null, timestamp: number, now = Date.now()) {
  return Number.isFinite(latitude) && latitude >= -90 && latitude <= 90 &&
    Number.isFinite(longitude) && longitude >= -180 && longitude <= 180 &&
    accuracy !== null && Number.isFinite(accuracy) && accuracy >= 0 && accuracy <= 1000 &&
    timestamp >= now - 30000 && timestamp <= now + 10000;
}
export function navigationUrl(point: Point) {
  if (!Number.isFinite(point.lat) || !Number.isFinite(point.lng)) throw new Error('Ubicación no válida.');
  return `https://www.google.com/maps/dir/?api=1&destination=${point.lat},${point.lng}&travelmode=driving`;
}
