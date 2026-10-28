import { z } from "zod";
import { parseSupabaseConfig } from "../src/lib/env/public.ts";
const variables = {
  NEXT_PUBLIC_SUPABASE_URL: z.url(),
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().min(20),
  SUPABASE_SECRET_KEY: z.string().min(20),
  ORDER_TOKEN_SECRET: z.string().min(32),
  RESTAURANT_ID: z.uuid(),
  CRON_SECRET: z.string().min(32),
};
const failures = [];
for (const [name, schema] of Object.entries(variables))
  if (!schema.safeParse(process.env[name]).success) failures.push(name);
if (!["vercel", "cloudflare"].includes(process.env.TRUST_PROXY || ""))
  failures.push("TRUST_PROXY");
try {
  parseSupabaseConfig(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  );
} catch {
  failures.push(
    "Supabase public configuration (invalid URL or non-public key)",
  );
}
const publicKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || "";
if (publicKey.startsWith("sb_secret_"))
  failures.push(
    "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY (must not contain a secret key)",
  );
if (failures.length) {
  console.error(
    "Configure these variables securely before deploying:",
    failures.join(", "),
  );
  process.exitCode = 1;
} else
  console.log(
    "Deployment environment shape validated. This does not verify remote credentials, migrations or physical GPS.",
  );
