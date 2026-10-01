import { describe, expect, it } from "vitest";
import { readEnv } from "./env";

describe("readEnv", () => {
  it("development with no settings: PGlite, demo mode, a dev-only secret", () => {
    const env = readEnv({ NODE_ENV: "development" });
    expect(env).toMatchObject({ dataAdapter: "pglite", demoMode: true, appUrl: "http://localhost:3000", isProduction: false });
    expect(env.sessionSecret.length).toBeGreaterThanOrEqual(32);
  });

  it("production never falls back to demo mode or the dev secret", () => {
    const env = readEnv({ NODE_ENV: "production", DATA_ADAPTER: "supabase" });
    expect(env.demoMode).toBe(false);
    expect(() => env.sessionSecret).toThrow(/SESSION_SECRET/);
    expect(readEnv({ NODE_ENV: "production", SESSION_SECRET: "x".repeat(40) }).sessionSecret).toBe("x".repeat(40));
  });

  it("refuses PGlite on Vercel", () => {
    expect(() => readEnv({ NODE_ENV: "production", VERCEL: "1" })).toThrow(/DATA_ADAPTER=supabase/);
    expect(() => readEnv({ NODE_ENV: "production", VERCEL: "1", DATA_ADAPTER: "supabase" })).not.toThrow();
  });

  it("rejects an unknown adapter and trims a trailing slash from APP_URL", () => {
    expect(() => readEnv({ DATA_ADAPTER: "mysql" })).toThrow(/DATA_ADAPTER/);
    expect(readEnv({ APP_URL: "https://lostbox.example/" }).appUrl).toBe("https://lostbox.example");
  });

  it("demo mode is only on in production when asked for explicitly", () => {
    expect(readEnv({ NODE_ENV: "production", DEMO_MODE: "true" }).demoMode).toBe(true);
    expect(readEnv({ NODE_ENV: "development", DEMO_MODE: "false" }).demoMode).toBe(false);
  });
});
