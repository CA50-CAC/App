/**
 * The local (PGlite) staff session cookie. Separate from ./auth.ts so the
 * proxy can check it without importing server-component-only code.
 */
import { verifyToken } from "@/lib/auth/signed-token";

export const STAFF_COOKIE = "lb_staff";

export interface LocalStaffToken {
  uid: string;
  email: string;
}

export async function readLocalStaffCookie(value: string | undefined, secret: string): Promise<LocalStaffToken | null> {
  if (!value) return null;
  const data = await verifyToken<LocalStaffToken>(value, secret);
  return data && typeof data.uid === "string" && typeof data.email === "string" ? data : null;
}
