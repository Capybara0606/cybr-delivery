import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { parseSupabaseConfig } from "@/lib/env/public";
export async function createSupabaseServerClient() {
  const config = parseSupabaseConfig(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  );
  if (!config)
    throw new Error("Supabase is not configured for this installation");
  const store = await cookies();
  return createServerClient(config.url, config.publishableKey, {
    cookies: {
      getAll: () => store.getAll(),
      // Use this client in Route Handlers/Server Actions for cookie mutations. No swallowed refresh failures.
      setAll: (items) => {
        for (const { name, value, options } of items)
          store.set(name, value, options);
      },
    },
  });
}
