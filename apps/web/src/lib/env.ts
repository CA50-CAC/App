/**
 * Every environment setting the app reads, in one place, with safe defaults
 * for local development.
 *
 * `pnpm seed:demo && pnpm dev` must work with no .env.local at all, so in
 * development: the adapter defaults to PGlite, demo mode turns on with it, and
 * a fixed development-only session secret is used. None of those defaults
 * apply in production (`next build`/`next start`, or on Vercel).
 */
export type DataAdapter = "pglite" | "supabase";

export interface AppEnv {
  dataAdapter: DataAdapter;
  demoMode: boolean;
  appUrl: string;
  sessionSecret: string;
  isProduction: boolean;
}

/** Only ever used outside production, so a leaked dev cookie is worthless. */
const DEV_SESSION_SECRET = "lostbox-development-only-secret-not-for-production";

export function readEnv(env: Record<string, string | undefined> = process.env): AppEnv {
  const isProduction = env.NODE_ENV === "production";
  const dataAdapter: DataAdapter = env.DATA_ADAPTER === "supabase" ? "supabase" : "pglite";

  if (env.DATA_ADAPTER && env.DATA_ADAPTER !== "pglite" && env.DATA_ADAPTER !== "supabase") {
    throw new Error(`DATA_ADAPTER must be "pglite" or "supabase", not "${env.DATA_ADAPTER}"`);
  }
  // PGlite keeps its data in a local folder. On Vercel each request can land on
  // a fresh machine, so data would vanish. Refuse instead of losing data.
  if (env.VERCEL && dataAdapter !== "supabase") {
    throw new Error("On Vercel, set DATA_ADAPTER=supabase. PGlite only works on a single machine.");
  }

  const demoMode =
    env.DEMO_MODE === "true" || (env.DEMO_MODE === undefined && dataAdapter === "pglite" && !isProduction);

  let sessionSecret = env.SESSION_SECRET ?? "";
  if (!sessionSecret && !isProduction) sessionSecret = DEV_SESSION_SECRET;
  if (sessionSecret.length < 32) {
    throw new Error("SESSION_SECRET must be set to at least 32 random characters. See .env.example.");
  }
  if (isProduction && sessionSecret === DEV_SESSION_SECRET) {
    throw new Error("SESSION_SECRET is the development default. Set a real one for production.");
  }

  const appUrl = (env.APP_URL || (env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${env.VERCEL_PROJECT_PRODUCTION_URL}` : "http://localhost:3000")).replace(/\/+$/, "");

  return { dataAdapter, demoMode, appUrl, sessionSecret, isProduction };
}

let cached: AppEnv | null = null;

export function appEnv(): AppEnv {
  cached ??= readEnv();
  return cached;
}
