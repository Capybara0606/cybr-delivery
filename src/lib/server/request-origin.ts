/** Compare exact origins, never browser-supplied forwarded host headers. */
export function allowedRequestOrigin(request: Request, configuredOrigin: string) {
  if (request.headers.get("sec-fetch-site") === "cross-site") return false;
  const origin = request.headers.get("origin");
  if (!origin) return true;
  const allowed = [new URL(request.url).origin];
  try {
    const configured = new URL(configuredOrigin);
    if (configured.protocol === "https:") allowed.push(configured.origin);
  } catch {
    // Invalid deployment configuration must never broaden the allowlist.
  }
  return allowed.includes(origin);
}
