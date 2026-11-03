import { describe, expect, it } from 'vitest';
import { canTrack, canShareShift, nextDriverAction, navigationUrl, validPosition, type Delivery, type Workspace } from '../../apps/driver/src/domain/delivery';
const delivery = (status: string, assignment_status: string) => ({ status, assignment_status }) as Delivery;
describe('native driver GPS policy', () => {
  it('shares only for an accepted order on the way', () => {
    expect(canTrack(delivery('on_the_way', 'accepted'))).toBe(true);
    for (const status of ['ready_for_pickup', 'picked_up', 'delivered', 'cancelled']) expect(canTrack(delivery(status, 'accepted'))).toBe(false);
    expect(canTrack(delivery('on_the_way', 'offered'))).toBe(false);
    expect(canTrack(null)).toBe(false);
  });
  it('accepts a recent accurate measurement', () => {
    expect(validPosition(13.7, -89.2, 8, 100000, 100000)).toBe(true);
  });
  it('rejects stale, future, inaccurate, invalid and absent measurements', () => {
    expect(validPosition(13.7, -89.2, 8, 69999, 100000)).toBe(false);
    expect(validPosition(13.7, -89.2, 8, 110001, 100000)).toBe(false);
    expect(validPosition(13.7, -89.2, null, 100000, 100000)).toBe(false);
    expect(validPosition(13.7, -89.2, 1001, 100000, 100000)).toBe(false);
    expect(validPosition(NaN, -89.2, 8, 100000, 100000)).toBe(false);
    expect(validPosition(91, -89.2, 8, 100000, 100000)).toBe(false);
    expect(validPosition(13.7, -181, 8, 100000, 100000)).toBe(false);
  });
  it('opens navigation at the actual coordinates', () => {
    expect(navigationUrl({ lat: 13.7, lng: -89.2 })).toBe('https://www.google.com/maps/dir/?api=1&destination=13.7,-89.2&travelmode=driving');
    expect(() => navigationUrl({ lat: NaN, lng: 0 })).toThrow();
  });
});

describe('native driver next action and shift scope', () => {
  it('offers pickup for the actual assigned state after acceptance', () => {
    expect(nextDriverAction(delivery('assigned', 'accepted'))).toBe('picked_up');
    expect(nextDriverAction(delivery('assigned', 'offered'))).toBeNull();
    expect(nextDriverAction(delivery('ready_for_pickup', 'accepted'))).toBeNull();
  });
  it('exposes the complete path to finish delivery', () => {
    expect(nextDriverAction(delivery('picked_up', 'accepted'))).toBe('on_the_way');
    expect(nextDriverAction(delivery('on_the_way', 'accepted'))).toBe('delivered');
    expect(nextDriverAction(delivery('delivered', 'accepted'))).toBeNull();
    expect(nextDriverAction(null)).toBeNull();
  });
  it('continues shift GPS between orders and stops outside the shift', () => {
    const state = (available: boolean, active: Delivery | null) => ({ driver: { is_available: available }, active }) as Workspace;
    expect(canShareShift(state(true, null))).toBe(true);
    expect(canShareShift(state(true, delivery('assigned', 'accepted')))).toBe(true);
    expect(canShareShift(state(true, delivery('delivered', 'completed')))).toBe(true);
    expect(canShareShift(state(false, delivery('on_the_way', 'accepted')))).toBe(false);
    expect(canShareShift(null)).toBe(false);
  });
});
