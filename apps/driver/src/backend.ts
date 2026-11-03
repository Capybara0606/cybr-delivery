import 'react-native-url-polyfill/auto';
import * as SecureStore from 'expo-secure-store';
import { createClient, processLock, type SupabaseClient } from '@supabase/supabase-js';
import { digestStringAsync, CryptoDigestAlgorithm } from 'expo-crypto';
import { config, validateConfig } from './config';
import type { Workspace } from './domain/delivery';

const options = { keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY };
// Split large auth sessions: SecureStore items have platform-dependent size limits.
const storage = {
  async getItem(key: string) {
    const manifest = await SecureStore.getItemAsync(`${key}.manifest`, options);
    if (!manifest) return null;
    const { generation, count } = JSON.parse(manifest) as { generation: string; count: number };
    if (!Number.isInteger(count) || count < 1 || count > 100) return null;
    const parts = await Promise.all(Array.from({ length: count }, (_, i) => SecureStore.getItemAsync(`${key}.${generation}.${i}`, options)));
    return parts.some(p => p === null) ? null : parts.join('');
  },
  async setItem(key: string, value: string) {
    const previous = await SecureStore.getItemAsync(`${key}.manifest`, options);
    const generation = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const parts = value.match(/.{1,1800}/gs) || [''];
    await Promise.all(parts.map((part, i) => SecureStore.setItemAsync(`${key}.${generation}.${i}`, part, options)));
    await SecureStore.setItemAsync(`${key}.manifest`, JSON.stringify({ generation, count: parts.length }), options);
    if (previous) {
      const old = JSON.parse(previous) as { generation: string; count: number };
      await Promise.all(Array.from({ length: old.count }, (_, i) => SecureStore.deleteItemAsync(`${key}.${old.generation}.${i}`, options)));
    }
  },
  async removeItem(key: string) {
    const previous = await SecureStore.getItemAsync(`${key}.manifest`, options);
    await SecureStore.deleteItemAsync(`${key}.manifest`, options);
    if (previous) {
      const old = JSON.parse(previous) as { generation: string; count: number };
      await Promise.all(Array.from({ length: old.count }, (_, i) => SecureStore.deleteItemAsync(`${key}.${old.generation}.${i}`, options)));
    }
  },
};
let client: SupabaseClient | undefined;
export function backend() {
  validateConfig();
  return client ||= createClient(config.supabaseUrl, config.publishableKey, {
    auth: { storage, autoRefreshToken: true, persistSession: true, detectSessionInUrl: false, lock: processLock },
    global: { fetch: (input, init) => fetch(input, { ...init, signal: AbortSignal.timeout(15000) }) },
  });
}
export async function workspace(): Promise<Workspace> {
  const db = backend();
  const { data: { user }, error: authError } = await db.auth.getUser();
  if (authError || !user) throw new Error('Inicia sesión para continuar.');
  const { data: member, error: memberError } = await db.from('restaurant_members').select('role').eq('restaurant_id', config.restaurantId).eq('user_id', user.id).single();
  if (memberError || member?.role !== 'driver') throw new Error('Esta cuenta no tiene permisos de repartidor en este restaurante.');
  const { data, error } = await db.rpc('driver_workspace');
  if (error) throw new Error('No se pudo consultar tu turno. Revisa la conexión.');
  return data as Workspace;
}
export async function command(action: string, fields: { available?: boolean; assignment_id?: string; accept?: boolean; order_id?: string; code?: string } = {}) {
  const db = backend();
  let result;
  if (action === 'availability') result = await db.rpc('set_driver_availability', { p_available: fields.available });
  else if (action === 'respond') result = await db.rpc('respond_assignment', { p_assignment: fields.assignment_id, p_accept: fields.accept });
  else result = await db.rpc('driver_progress', {
    p_order: fields.order_id, p_action: action,
    p_code_hash: fields.code ? await digestStringAsync(CryptoDigestAlgorithm.SHA256, fields.code) : null,
  });
  if (result.error) throw new Error('No se pudo guardar el cambio. Actualiza y verifica tu conexión y el estado del pedido.');
  if (result.data?.ok === false) throw new Error(result.data.error || 'No se pudo confirmar la entrega.');
}
