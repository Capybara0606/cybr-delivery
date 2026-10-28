import { describe, it, expect } from "vitest";
import { parseSupabaseConfig } from "../../src/lib/env/public";
const jwt = (role: string) =>
  `header.${btoa(JSON.stringify({ role }))}.signature`;
describe("Supabase browser boundary", () => {
  it("starts without a configured project, but rejects half configuration", () => {
    expect(parseSupabaseConfig(undefined, undefined)).toBeNull();
    expect(() =>
      parseSupabaseConfig("https://example.supabase.co", undefined),
    ).toThrow();
  });
  it("accepts public keys and localhost for development", () => {
    expect(
      parseSupabaseConfig("http://127.0.0.1:54321", "sb_publishable_example")
        ?.url,
    ).toContain("127.0.0.1");
    expect(
      parseSupabaseConfig("https://example.supabase.co", jwt("anon")),
    ).not.toBeNull();
  });
  it("rejects secret keys, legacy service role keys, malformed keys and remote HTTP", () => {
    for (const key of ["sb_secret_example", jwt("service_role"), "invalid"])
      expect(() =>
        parseSupabaseConfig("https://example.supabase.co", key),
      ).toThrow();
    expect(() =>
      parseSupabaseConfig("http://example.com", "sb_publishable_example"),
    ).toThrow();
  });
});
