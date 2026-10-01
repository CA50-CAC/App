/**
 * Authentication behind an interface.
 *
 * Today only staff and school admins sign in (email magic link, no passwords).
 * Students are anonymous and only hold a signed "joined school X" cookie.
 *
 * Keeping auth behind this interface means we can:
 * - run a local provider for the prototype (the magic link is shown on screen
 *   instead of emailed), and swap in Supabase Auth for the real deployment
 * - add student login later without rewriting the pages that check sessions
 */

export interface StaffSession {
  userId: string;
  email: string;
  isPlatformAdmin: boolean;
  /**
   * The Supabase login token, passed to the data layer so Row Level Security
   * knows who is asking. Null with the local provider. Server-side only: never
   * send it to the browser.
   */
  accessToken: string | null;
}

export interface MagicLinkResult {
  /**
   * In demo mode and local dev the link is returned so the UI can show it.
   * In production this is always undefined and the link goes by email.
   */
  devLink?: string;
}

export interface AuthProvider {
  /** `next` is the in-app path to land on after signing in (already checked by safeNextPath). */
  sendMagicLink(email: string, next: string): Promise<MagicLinkResult>;
  /**
   * Redeems the link's query parameters for a session and sets the session
   * cookies. Returns null if the link is invalid, expired, or already used.
   */
  verifyMagicLink(params: URLSearchParams): Promise<StaffSession | null>;
  getStaffSession(): Promise<StaffSession | null>;
  signOut(): Promise<void>;
}

/** Platform admins are configured by env var, never stored in the database. */
export function isPlatformAdminEmail(email: string, envValue = process.env.PLATFORM_ADMIN_EMAILS ?? ""): boolean {
  const target = email.trim().toLowerCase();
  return envValue
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean)
    .includes(target);
}

/**
 * Where to go after signing in. Only same-site paths are allowed, so a link
 * like /login?next=https://evil.example can't bounce someone to another site.
 */
export function safeNextPath(next: string | null | undefined, fallback = "/admin"): string {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.includes("\\")) return fallback;
  return next;
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}
