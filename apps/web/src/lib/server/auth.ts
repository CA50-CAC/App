/**
 * Staff sign-in for the running app: picks the provider by DATA_ADAPTER and
 * handles the cookies.
 *
 * - Local (PGlite): our own magic links (src/lib/auth/local-links.ts) and a
 *   signed `lb_staff` cookie. The link is shown on screen, never emailed, so
 *   this provider only runs in development and demo mode.
 * - Supabase: Supabase Auth sends the email and keeps the session in its own
 *   cookies; src/proxy.ts refreshes it on every request.
 *
 * Pages call `getStaffSession()` (or `requireStaff()`), never a provider directly.
 */
import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { redeemLocalMagicToken, createLocalMagicToken } from "@/lib/auth/local-links";
import {
  isPlatformAdminEmail,
  normalizeEmail,
  safeNextPath,
  type AuthProvider,
  type StaffSession,
} from "@/lib/auth/provider";
import { signToken } from "@/lib/auth/signed-token";
import { STAFF_COOKIE, readLocalStaffCookie, type LocalStaffToken } from "./auth-cookie";
import { appEnv } from "@/lib/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getPglite } from "./pglite-instance";

const NEXT_COOKIE = "lb_next";
const SESSION_DAYS = 7;


function cookieOptions(maxAgeSeconds: number) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: appEnv().isProduction,
    path: "/",
    maxAge: maxAgeSeconds,
  };
}

function session(userId: string, email: string, accessToken: string | null): StaffSession {
  return { userId, email, accessToken, isPlatformAdmin: isPlatformAdminEmail(email) };
}

const localProvider: AuthProvider = {
  async sendMagicLink(email, next) {
    const env = appEnv();
    const token = await createLocalMagicToken(await getPglite(), email);
    const link = `${env.appUrl}/auth/confirm?token=${encodeURIComponent(token)}&next=${encodeURIComponent(next)}`;
    // There's no email sender locally. Showing the link is only acceptable in
    // development or demo mode, where there's no real data to protect.
    if (env.isProduction && !env.demoMode) {
      throw new Error("The local sign-in provider can't send email. Use DATA_ADAPTER=supabase in production.");
    }
    return { devLink: link };
  },

  async verifyMagicLink(params) {
    const user = await redeemLocalMagicToken(await getPglite(), params.get("token") ?? "");
    if (!user) return null;
    const env = appEnv();
    const value = await signToken<LocalStaffToken>({ uid: user.userId, email: user.email }, SESSION_DAYS * 86400, env.sessionSecret);
    (await cookies()).set(STAFF_COOKIE, value, cookieOptions(SESSION_DAYS * 86400));
    return session(user.userId, user.email, null);
  },

  async getStaffSession() {
    const data = await readLocalStaffCookie((await cookies()).get(STAFF_COOKIE)?.value, appEnv().sessionSecret);
    return data ? session(data.uid, data.email, null) : null;
  },

  async signOut() {
    (await cookies()).delete(STAFF_COOKIE);
  },
};

const supabaseProvider: AuthProvider = {
  async sendMagicLink(email, next) {
    const supabase = await createSupabaseServerClient();
    // Remember where to go after sign-in. The recommended email template links
    // to /auth/confirm without our `next`, so a short-lived cookie carries it.
    (await cookies()).set(NEXT_COOKIE, next, cookieOptions(60 * 60));
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${appEnv().appUrl}/auth/confirm?next=${encodeURIComponent(next)}`, shouldCreateUser: true },
    });
    if (error) throw new Error(`Couldn't send the sign-in email: ${error.message}`);
    return {};
  },

  async verifyMagicLink(params) {
    const supabase = await createSupabaseServerClient();
    const tokenHash = params.get("token_hash");
    const code = params.get("code");
    if (tokenHash) {
      // The link from our email template: works on any device.
      const type = params.get("type") === "magiclink" ? "magiclink" : "email";
      const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type });
      if (error) return null;
    } else if (code) {
      // Supabase's default template: only works in the browser that asked for the link.
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (error) return null;
    } else {
      return null;
    }
    const { data } = await supabase.auth.getClaims();
    const claims = data?.claims;
    if (!claims?.sub || typeof claims.email !== "string") return null;
    const { data: s } = await supabase.auth.getSession();
    return session(claims.sub, normalizeEmail(claims.email), s.session?.access_token ?? null);
  },

  async getStaffSession() {
    const supabase = await createSupabaseServerClient();
    // getClaims() checks the token's signature; getSession() alone would trust the cookie.
    const { data, error } = await supabase.auth.getClaims();
    const claims = data?.claims;
    if (error || !claims?.sub || typeof claims.email !== "string") return null;
    const { data: s } = await supabase.auth.getSession();
    const accessToken = s.session?.access_token ?? null;
    if (!accessToken) return null;
    return session(claims.sub, normalizeEmail(claims.email), accessToken);
  },

  async signOut() {
    const supabase = await createSupabaseServerClient();
    await supabase.auth.signOut();
  },
};

export function authProvider(): AuthProvider {
  return appEnv().dataAdapter === "supabase" ? supabaseProvider : localProvider;
}

/** The signed-in staff member, or null. Cached for the length of one request. */
export const getStaffSession = cache(async (): Promise<StaffSession | null> => authProvider().getStaffSession());

/** For pages and actions that need a signed-in staff member. Sends everyone else to /login. */
export async function requireStaff(nextPath: string): Promise<StaffSession> {
  const s = await getStaffSession();
  if (!s) redirect(`/login?next=${encodeURIComponent(safeNextPath(nextPath))}`);
  return s;
}

/** Where /auth/confirm should send the user (Supabase's token_hash flow loses our `next`). */
export async function takeNextPath(params: URLSearchParams): Promise<string> {
  const store = await cookies();
  const fromCookie = store.get(NEXT_COOKIE)?.value;
  if (fromCookie) store.delete(NEXT_COOKIE);
  return safeNextPath(params.get("next") ?? fromCookie);
}
