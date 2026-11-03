import { afterEach, describe, expect, it, vi } from 'vitest';
import { browserStorage, browserUuid } from '../../src/lib/browser/compat';
afterEach(() => vi.unstubAllGlobals());
describe('older browser catalog prerequisites', () => {
  it('uses secure randomness when randomUUID is absent', () => {
    const original = globalThis.crypto;
    vi.stubGlobal('crypto', { getRandomValues: original.getRandomValues.bind(original) });
    expect(browserUuid()).toMatch(/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/);
  });
  it('never substitutes weak randomness when crypto is unavailable', () => {
    vi.stubGlobal('crypto', undefined);
    expect(() => browserUuid()).toThrow('pedido seguro');
  });
  it('does not let blocked storage prevent catalog or checkout', () => {
    const denied = () => { throw new Error('SecurityError'); };
    vi.stubGlobal('localStorage', { getItem: denied, setItem: denied, removeItem: denied });
    expect(browserStorage.get('cart')).toBeNull();
    expect(() => browserStorage.set('cart', 'value')).not.toThrow();
    expect(() => browserStorage.remove('cart')).not.toThrow();
  });
  it('retains persistence when storage is available', () => {
    const values = new Map<string, string>();
    vi.stubGlobal('localStorage', { getItem: (k: string) => values.get(k) ?? null, setItem: (k: string, v: string) => values.set(k, v), removeItem: (k: string) => values.delete(k) });
    browserStorage.set('cart', 'value');
    expect(browserStorage.get('cart')).toBe('value');
    browserStorage.remove('cart');
    expect(browserStorage.get('cart')).toBeNull();
  });
});
