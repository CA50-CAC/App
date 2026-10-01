/**
 * Keeps a signed-in staff member's Supabase session fresh.
 *
 * Supabase access tokens are short-lived. Server Components can read cookies
 * but can't write them, so they can't save a refreshed token. The proxy runs
 * before every page, refreshes the token if needed, and writes the new cookies
 * onto both the request (so this page render sees them) and the response (so
 * the browser keeps them).
 *
 * The refresh only happens because we call `getClaims()`. Without that call the
 * client never checks the token and nothing gets refreshed.
 */
import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";
import type { SupabaseConfig } from "./config";

export async function refreshSupabaseSession(request: NextRequest, config: SupabaseConfig): Promise<NextResponse> {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(config.url, config.publishableKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        // Cache-control headers that stop a CDN from caching one user's
        // refreshed cookies and handing them to someone else.
        Object.entries(headers).forEach(([key, value]) => response.headers.set(key, value));
      },
    },
  });

  // Don't put code between createServerClient and this call.
  await supabase.auth.getClaims();

  return response;
}
