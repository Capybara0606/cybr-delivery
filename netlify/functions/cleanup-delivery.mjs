import { createClient } from "@supabase/supabase-js";

// Scheduled functions cannot be invoked as public HTTP endpoints on Netlify.
export const config = { schedule: "0 0 * * *" };

export default async function cleanupDelivery() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) throw new Error("Maintenance environment is not configured");
  const client = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { fetch: (input, init) => fetch(input, { ...init, signal: AbortSignal.timeout(20000) }) },
  });
  const { error } = await client.rpc("cleanup_delivery_data");
  if (error) throw new Error("Delivery maintenance failed");
  return new Response(null, { status: 204 });
}
