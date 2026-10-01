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
}

export interface MagicLinkResult {
  /**
   * In demo mode and local dev the link is returned so the UI can show it.
   * In production this is always undefined and the link goes by email.
   */
  devLink?: string;
}

export interface AuthProvider {
  sendMagicLink(email: string, redirectTo: string): Promise<MagicLinkResult>;
  /** Exchanges a one-time token for a session. Returns null if the token is invalid or used. */
  verifyMagicLink(token: string): Promise<StaffSession | null>;
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
