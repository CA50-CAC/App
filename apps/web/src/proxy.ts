/**
 * Next.js Proxy (called "middleware" before Next 16). Runs before every page.
 *
 * Its only job today is refreshing the Supabase session when DATA_ADAPTER=supabase.
 * With PGlite it does nothing. Authorization is NOT decided here: pages and
 * server routes check the session themselves, and RLS checks it again in the
 * database.
 */
import { type NextRequest, NextResponse } from "next/server";
import { supabaseConfig } from "@/lib/supabase/config";
import { refreshSupabaseSession } from "@/lib/supabase/proxy";

export async function proxy(request: NextRequest) {
  const config = supabaseConfig();
  if (!config) return NextResponse.next();
  return refreshSupabaseSession(request, config);
}

export const config = {
  // Skip static files and images; they never need a session.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)"],
};
