"use client";
import { createBrowserClient } from "@supabase/ssr";
import { parseSupabaseConfig } from "@/lib/env/public";
export function createSupabaseBrowserClient() {
  const config = parseSupabaseConfig(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  );
  if (!config)
    throw new Error("Supabase is not configured for this installation");
  return createBrowserClient(config.url, config.publishableKey);
}
