/**
 * Where the app finds its Supabase project.
 *
 * Supabase is only used when DATA_ADAPTER=supabase. The prototype, the tests,
 * and the demo run on PGlite and never read these variables, so a missing value
 * returns null instead of crashing.
 *
 * The publishable key (`sb_publishable_...`) is designed to be public: it only
 * lets a client act as `anon` or as a signed-in user, and Row Level Security
 * decides what that can touch. The secret key (`sb_secret_...`) is different
 * and must never appear in NEXT_PUBLIC_ variables or in the repo.
 */
export interface SupabaseConfig {
  url: string;
  publishableKey: string;
}

export function supabaseConfig(env: Record<string, string | undefined> = process.env): SupabaseConfig | null {
  if (env.DATA_ADAPTER !== "supabase") return null;
  const url = env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey = env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !publishableKey) {
    throw new Error(
      "DATA_ADAPTER=supabase needs NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY in apps/web/.env.local",
    );
  }
  return { url, publishableKey };
}
