import installation from '../installation.json';
export const config = {
  restaurantName: process.env.EXPO_PUBLIC_RESTAURANT_NAME || installation.restaurantName,
  supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL || installation.supabaseUrl,
  publishableKey: process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY || installation.publishableKey,
  restaurantId: process.env.EXPO_PUBLIC_RESTAURANT_ID || installation.restaurantId,
};
export function validateConfig() {
  if (!config.supabaseUrl.startsWith('https://') || !config.publishableKey.startsWith('sb_publishable_'))
    throw new Error('Configura la URL y la clave pública de esta instalación antes de compilar.');
}
