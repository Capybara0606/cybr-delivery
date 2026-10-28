import { z } from "zod";
const schema = z.object({
  url: z
    .url()
    .refine(
      (value) =>
        value.startsWith("https://") ||
        /^http:\/\/(127\.0\.0\.1|localhost)(:\d+)?\/?$/.test(value),
      "Use HTTPS except for localhost",
    ),
  publishableKey: z
    .string()
    .min(1)
    .refine(
      (value) => !value.startsWith("sb_secret_"),
      "A secret key must never be used in the browser",
    ),
});
export type SupabasePublicConfig = z.infer<typeof schema>;
export function parseSupabaseConfig(
  url: string | undefined,
  publishableKey: string | undefined,
): SupabasePublicConfig | null {
  if (!url && !publishableKey) return null;
  const config = schema.parse({ url, publishableKey });
  // Legacy JWT keys are allowed only if they declare the public anon role. New keys use sb_publishable_.
  if (!config.publishableKey.startsWith("sb_publishable_")) {
    try {
      const encoded = config.publishableKey.split(".")[1];
      const payload = JSON.parse(
        atob(encoded.replaceAll("-", "+").replaceAll("_", "/")),
      );
      if (payload.role !== "anon") throw new Error("not anon");
    } catch {
      throw new Error(
        "Use a Supabase publishable key or a legacy anon key, never a privileged key",
      );
    }
  }
  return config;
}
