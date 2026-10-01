/**
 * Next.js Proxy (called "middleware" before Next 16). Runs before every page.
 *
 * Two jobs:
 * 1. Refresh the Supabase session when DATA_ADAPTER=supabase, so staff stay
 *    signed in (short-lived tokens are renewed here and saved to cookies).
 * 2. Send visitors who aren't signed in away from staff pages, to /login.
 *
 * This is a convenience, not the security boundary. Every staff page and
 * action checks the session again (requireStaff), and Row Level Security
 * checks it again in the database.
 */
import { type NextRequest, NextResponse } from "next/server";
import { isStaffOnlyPath } from "@/lib/auth/paths";
import { appEnv } from "@/lib/env";
import { STAFF_COOKIE, readLocalStaffCookie } from "@/lib/server/auth-cookie";
import { supabaseConfig } from "@/lib/supabase/config";
import { refreshSupabaseSession } from "@/lib/supabase/proxy";

export async function proxy(request: NextRequest) {
  const config = supabaseConfig();
  let response = NextResponse.next();
  let signedIn: boolean;

  if (config) {
    ({ response, signedIn } = await refreshSupabaseSession(request, config));
  } else {
    signedIn = Boolean(await readLocalStaffCookie(request.cookies.get(STAFF_COOKIE)?.value, appEnv().sessionSecret));
  }

  if (!signedIn && isStaffOnlyPath(request.nextUrl.pathname)) {
    const login = request.nextUrl.clone();
    login.pathname = "/login";
    login.search = `?next=${encodeURIComponent(request.nextUrl.pathname + request.nextUrl.search)}`;
    return NextResponse.redirect(login);
  }
  return response;
}

export const config = {
  // Skip static files and images; they never need a session.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api/photos|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)"],
};
