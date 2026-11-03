import { describe, expect, it } from 'vitest';
import { fleetSignal, fleetPositions, type ShiftLocation } from '../../src/lib/commerce/fleet';
const row = (age: number | null = 0, lat: number | null = 13.7): ShiftLocation => ({ driver_id: 'driver', driver_name: 'Carlos', lat, lng: -89.2, accuracy_m: 8, received_at: null, recorded_at: null, age_seconds: age, order_number: null, order_status: null });
describe('fleet GPS freshness', () => {
  it('marks 30-second positions stale and removes 90-second positions', () => {
    expect(fleetSignal(row(29))).toBe('fresh');
    expect(fleetSignal(row(30))).toBe('stale');
    expect(fleetSignal(row(89))).toBe('stale');
    expect(fleetSignal(row(90))).toBe('no_signal');
  });
  it('ages positions even when polling fails or the page returns from background', () => {
    expect(fleetSignal(row(20), 15)).toBe('stale');
    expect(fleetPositions([row(20)], 71)).toEqual([]);
  });
  it('never invents coordinates for missing, invalid or expired GPS', () => {
    for (const value of [row(null), row(0, null), row(0, NaN), row(0, 91), row(-1), row(Infinity)]) expect(fleetSignal(value)).toBe('no_signal');
  });
});
