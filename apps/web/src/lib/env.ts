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
  if (env.VERCEL) {
    const missing = missingVercelSettings(env);
    if (missing.length) {
      throw new Error(
        `Vercel (${env.VERCEL_ENV ?? "unknown"} environment) is missing settings:\n` +
          missing.map((m) => `  - ${m}`).join("\n") +
          `\nAdd them in Vercel > Project > Settings > Environment Variables, ticking the ` +
          `"${env.VERCEL_ENV === "production" ? "Production" : env.VERCEL_ENV === "preview" ? "Preview" : env.VERCEL_ENV ?? "matching"}" environment, then redeploy. See docs/DEPLOY.md.`,
      );
    }
  }

  const demoMode =
    env.DEMO_MODE === "true" || (env.DEMO_MODE === undefined && dataAdapter === "pglite" && !isProduction);

  // Checked when first used, not here, so `next build` can prerender static
  // pages (like the 404 page) without the secret.
  const sessionSecret = () => {
    const secret = env.SESSION_SECRET || (isProduction ? "" : DEV_SESSION_SECRET);
    if (secret.length < 32) {
      throw new Error("SESSION_SECRET must be set to at least 32 random characters. See .env.example.");
    }
    if (isProduction && secret === DEV_SESSION_SECRET) {
      throw new Error("SESSION_SECRET is the development default. Set a real one for production.");
    }
    return secret;
  };

  const appUrl = (env.APP_URL || vercelUrl(env) || "http://localhost:3000").replace(/\/+$/, "");

  return {
    dataAdapter,
    demoMode,
    appUrl,
    isProduction,
    get sessionSecret() {
      return sessionSecret();
    },
  };
}

/**
 * Everything a Vercel deployment needs, all reported at once so a failed
 * build lists every missing setting instead of one per attempt.
 * PGlite isn't allowed there: it keeps data in a local folder, and on Vercel
 * each request can land on a fresh machine, so data would vanish.
 */
export function missingVercelSettings(env: Record<string, string | undefined>): string[] {
  const missing: string[] = [];
  if (env.DATA_ADAPTER !== "supabase") missing.push("DATA_ADAPTER=supabase (PGlite only works on a single machine)");
  if (!env.NEXT_PUBLIC_SUPABASE_URL) missing.push("NEXT_PUBLIC_SUPABASE_URL");
  if (!env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) missing.push("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY");
  if (!env.SUPABASE_SECRET_KEY) missing.push("SUPABASE_SECRET_KEY");
  if ((env.SESSION_SECRET ?? "").length < 32) missing.push("SESSION_SECRET (at least 32 random characters)");
  return missing;
}

/** Without APP_URL: previews link to their own branch URL, production to the production domain. */
function vercelUrl(env: Record<string, string | undefined>): string | null {
  const host =
    env.VERCEL_ENV === "preview"
      ? env.VERCEL_BRANCH_URL || env.VERCEL_URL
      : env.VERCEL_PROJECT_PRODUCTION_URL || env.VERCEL_URL;
  return host ? `https://${host}` : null;
}

let cached: AppEnv | null = null;

export function appEnv(): AppEnv {
  cached ??= readEnv();
  return cached;
}
