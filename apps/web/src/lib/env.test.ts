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

  const vercelOk = {
    NODE_ENV: "production",
    VERCEL: "1",
    VERCEL_ENV: "preview",
    DATA_ADAPTER: "supabase",
    NEXT_PUBLIC_SUPABASE_URL: "https://x.supabase.co",
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_x",
    SUPABASE_SECRET_KEY: "sb_secret_x",
    SESSION_SECRET: "s".repeat(40),
  };

  it("on Vercel, lists every missing setting at once and names the environment", () => {
    let message = "";
    try {
      readEnv({ NODE_ENV: "production", VERCEL: "1", VERCEL_ENV: "preview" });
    } catch (e) {
      message = (e as Error).message;
    }
    for (const name of ["DATA_ADAPTER=supabase", "NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "SUPABASE_SECRET_KEY", "SESSION_SECRET"]) {
      expect(message).toContain(name);
    }
    expect(message).toContain('"Preview"');
    expect(() => readEnv(vercelOk)).not.toThrow();
  });

  it("on Vercel without APP_URL, previews link to their branch URL and production to the production domain", () => {
    expect(readEnv({ ...vercelOk, VERCEL_BRANCH_URL: "lostbox-git-x.vercel.app", VERCEL_PROJECT_PRODUCTION_URL: "lostbox.org" }).appUrl).toBe(
      "https://lostbox-git-x.vercel.app",
    );
    expect(readEnv({ ...vercelOk, VERCEL_ENV: "production", VERCEL_PROJECT_PRODUCTION_URL: "lostbox.org" }).appUrl).toBe("https://lostbox.org");
    expect(readEnv({ ...vercelOk, APP_URL: "https://custom.org" }).appUrl).toBe("https://custom.org");
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
