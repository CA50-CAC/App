/**
 * A Supabase client for Server Components, Server Actions, and Route Handlers.
 *
 * It acts as whoever is signed in (their session lives in cookies), so every
 * query runs as the `authenticated` role under Row Level Security. Create one
 * per request; never share it between requests or users.
 *
 * There is deliberately no browser client. Students never talk to the database
 * (CLAUDE.md Section 6), and staff screens go through server code too, so the
 * only way into the database is through code we control.
 */
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { supabaseConfig } from "./config";

export async function createSupabaseServerClient() {
  const config = supabaseConfig();
  if (!config) throw new Error("Supabase is not enabled (DATA_ADAPTER is not 'supabase')");
  const cookieStore = await cookies();

  return createServerClient(config.url, config.publishableKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // Server Components can't set cookies. That's fine: src/proxy.ts has
          // already refreshed the session earlier in this same request.
        }
      },
    },
  });
}
