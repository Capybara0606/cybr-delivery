export type ShiftLocation = {
  driver_id: string;
  driver_name: string;
  lat: number | null;
  lng: number | null;
  accuracy_m: number | null;
  received_at: string | null;
  recorded_at: string | null;
  age_seconds: number | null;
  order_number: number | null;
  order_status: string | null;
};
export type FleetPosition = ShiftLocation & { lat: number; lng: number };
export function fleetSignal(row: ShiftLocation, elapsedSeconds = 0): "fresh" | "stale" | "no_signal" {
  if (row.lat === null || row.lng === null || !Number.isFinite(row.lat) || !Number.isFinite(row.lng)
    || Math.abs(row.lat) > 90 || Math.abs(row.lng) > 180 || row.age_seconds === null
    || !Number.isFinite(row.age_seconds) || row.age_seconds < 0) return "no_signal";
  const age = row.age_seconds + Math.max(0, elapsedSeconds);
  return age >= 90 ? "no_signal" : age >= 30 ? "stale" : "fresh";
}
export function fleetPositions(rows: ShiftLocation[], elapsedSeconds = 0): FleetPosition[] {
  return rows.filter((row) => fleetSignal(row, elapsedSeconds) !== "no_signal") as FleetPosition[];
}
