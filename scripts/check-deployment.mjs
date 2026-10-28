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
for (const [name, schema] of Object.entries(variables)) {
  const value = process.env[name];
  if (!schema.safeParse(value).success) {
    const reason = value === undefined
      ? "not available to build; check Production context and Builds scope"
      : value.length === 0
        ? "empty value in build context"
        : ["ORDER_TOKEN_SECRET", "CRON_SECRET"].includes(name) && value.length < 32
          ? "too short; requires at least 32 characters"
          : "invalid format";
    failures.push(`${name} (${reason})`);
  }
}
if (!["vercel", "cloudflare", "netlify"].includes(process.env.TRUST_PROXY || ""))
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
