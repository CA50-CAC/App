import { describe, expect, it } from "vitest";
import { supabaseConfig } from "./config";

describe("supabaseConfig", () => {
  it("is off unless DATA_ADAPTER=supabase, even if keys are present", () => {
    expect(
      supabaseConfig({
        DATA_ADAPTER: "pglite",
        NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
        NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_x",
      }),
    ).toBeNull();
  });

  it("fails loudly when Supabase is selected but not configured", () => {
    expect(() => supabaseConfig({ DATA_ADAPTER: "supabase" })).toThrow(/NEXT_PUBLIC_SUPABASE_URL/);
  });

  it("returns the url and publishable key", () => {
    expect(
      supabaseConfig({
        DATA_ADAPTER: "supabase",
        NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
        NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_x",
      }),
    ).toEqual({ url: "https://example.supabase.co", publishableKey: "sb_publishable_x" });
  });
});
