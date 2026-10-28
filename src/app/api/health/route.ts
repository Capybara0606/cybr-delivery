import { parseSupabaseConfig } from "@/lib/env/public";
export async function GET() {
  try {
    const config = parseSupabaseConfig(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    );
    return Response.json(
      {
        status: "ok",
        phase: 8,
        services: {
          database: config
            ? "configuration_present_unverified"
            : "not_configured",
          authentication: config
            ? "configuration_present_unverified"
            : "not_configured",
          gps: "requires_authenticated_active_delivery",
        },
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return Response.json(
      { status: "configuration_error", phase: 8 },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}
