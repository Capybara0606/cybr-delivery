import "server-only";
import { createClient } from "@supabase/supabase-js";
import { createHash, createHmac } from "node:crypto";
import { parseSupabaseConfig } from "@/lib/env/public";
export const restaurantId = () =>
  process.env.RESTAURANT_ID || "a0000000-0000-4000-8000-000000000001";
export function publicBackend() {
  const c = parseSupabaseConfig(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  );
  if (!c)
    throw new ApiError(
      503,
      "Esta instalación aún no está conectada a Supabase.",
    );
  return createClient(c.url, c.publishableKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
export function serviceBackend() {
  publicBackend();
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!key)
    throw new ApiError(503, "Falta la configuración segura del servidor.");
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
export const hash = (text: string) =>
  createHash("sha256").update(text).digest("hex");
export function orderSecrets(key: string, requestHash: string) {
  const secret = process.env.ORDER_TOKEN_SECRET;
  if (!secret || secret.length < 32)
    throw new ApiError(503, "Falta configurar la protección de pedidos.");
  const hmac = (label: string) =>
    createHmac("sha256", secret)
      .update(`${label}:${key}:${requestHash}`)
      .digest();
  return {
    token: hmac("tracking").toString("hex"),
    code: String(hmac("delivery").readUInt32BE(0) % 1000000).padStart(6, "0"),
  };
}
export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
export function sameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (
    (origin && origin !== new URL(request.url).origin) ||
    request.headers.get("sec-fetch-site") === "cross-site"
  )
    throw new ApiError(403, "Origen de solicitud no permitido.");
}
export async function readJson(request: Request) {
  if (!request.headers.get("content-type")?.includes("application/json"))
    throw new ApiError(415, "Se requiere JSON.");
  const reader = request.body?.getReader();
  if (!reader) throw new ApiError(400, "Falta el cuerpo JSON.");
  const chunks: Uint8Array[] = [];
  let size = 0;
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > 25000) {
      await reader.cancel();
      throw new ApiError(413, "Solicitud demasiado grande.");
    }
    chunks.push(value);
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.length;
  }
  try {
    return JSON.parse(new TextDecoder().decode(bytes));
  } catch {
    throw new ApiError(400, "JSON inválido.");
  }
}
export function apiFailure(error: unknown) {
  if (error instanceof ApiError)
    return Response.json({ error: error.message }, { status: error.status });
  if (error && typeof error === "object" && "issues" in error)
    return Response.json(
      { error: "Revisa los datos enviados." },
      { status: 400 },
    );
  return Response.json(
    { error: "No se pudo completar la operación." },
    { status: 500 },
  );
}
export async function limitRequest(
  request: Request,
  scope: string,
  max: number,
  seconds = 60,
) {
  const service = serviceBackend();
  const provider = process.env.TRUST_PROXY;
  const ip =
    provider === "vercel"
      ? request.headers.get("x-vercel-forwarded-for")
      : provider === "cloudflare"
        ? request.headers.get("cf-connecting-ip")
        : provider === "netlify"
          ? request.headers.get("x-nf-client-connection-ip")
          : "shared";
  const key = `${scope}:${hash(`${process.env.SUPABASE_SECRET_KEY}:${ip || "shared"}`)}`;
  const { data, error } = await service.rpc("consume_request_limit", {
    p_key: key,
    p_max: max,
    p_seconds: seconds,
  });
  if (error)
    throw new ApiError(503, "No se pudo verificar el límite de solicitudes.");
  if (!data)
    throw new ApiError(429, "Demasiadas solicitudes. Espera un minuto.");
}
export const noStore = {
  "Cache-Control": "no-store",
  "Referrer-Policy": "no-referrer",
};
