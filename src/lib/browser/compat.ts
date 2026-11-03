/** Secure UUID v4 for Safari versions without crypto.randomUUID (before 15.4). */
export function browserUuid(): string {
  if (typeof globalThis.crypto?.randomUUID === "function")
    return globalThis.crypto.randomUUID();
  if (typeof globalThis.crypto?.getRandomValues !== "function")
    throw new Error("Este navegador no permite crear un pedido seguro. Usa un navegador actualizado.");
  const bytes = globalThis.crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

// Storage may be disabled or full. Keep the live cart/idempotency key in React
// memory; persistence is optional and must not block catalog or order handling.
export const browserStorage = {
  get(key: string): string | null {
    try { return globalThis.localStorage.getItem(key); } catch { return null; }
  },
  set(key: string, value: string): void {
    try { globalThis.localStorage.setItem(key, value); } catch { /* Memory-only session. */ }
  },
  remove(key: string): void {
    try { globalThis.localStorage.removeItem(key); } catch { /* Memory-only session. */ }
  },
};
