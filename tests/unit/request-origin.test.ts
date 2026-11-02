import { describe, expect, it } from "vitest";
import { allowedRequestOrigin } from "../../src/lib/server/request-origin";

const site = "https://cybr-delivery.netlify.app";
const request = (origin?: string, extra: Record<string, string> = {}) =>
  new Request("http://localhost:3000/api/orders", {
    headers: { ...(origin ? { origin } : {}), ...extra },
  });

describe("request origins behind hosting proxy", () => {
  it("accepts the configured public origin despite an internal request URL", () => {
    expect(allowedRequestOrigin(request(site), site)).toBe(true);
  });
  it("accepts local same-origin requests", () => {
    expect(allowedRequestOrigin(request("http://localhost:3000"), site)).toBe(true);
  });
  it("rejects another website and misleading hostname suffixes", () => {
    for (const origin of ["https://evil.example", `${site}.evil.example`])
      expect(allowedRequestOrigin(request(origin), site)).toBe(false);
  });
  it("never trusts forwarded host to add origins", () => {
    expect(allowedRequestOrigin(request("https://evil.example", { "x-forwarded-host": "evil.example" }), site)).toBe(false);
  });
  it("rejects cross-site browser requests even for an allowed origin", () => {
    expect(allowedRequestOrigin(request(site, { "sec-fetch-site": "cross-site" }), site)).toBe(false);
  });
  it("fails closed for invalid public origin configuration", () => {
    expect(allowedRequestOrigin(request(site), "invalid")).toBe(false);
  });
  it("preserves non-browser clients without an Origin header", () => {
    expect(allowedRequestOrigin(request(), site)).toBe(true);
  });
});
