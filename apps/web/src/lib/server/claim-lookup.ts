import "server-only";
import { normalizeCode } from "@/lib/domain/codes";
import { allow, clientIp } from "./rate-limit";

/** Normalized claim code ("abcde-23456" -> "ABCDE23456"), or null if it can't be one. */
export function cleanClaimCode(raw: string): string | null {
  const code = normalizeCode(raw);
  return /^[A-Z0-9]{10}$/.test(code) ? code : null;
}

/** Claim lookups are rate-limited per network so codes can't be guessed. */
export async function claimStatusAllowed(): Promise<boolean> {
  return allow("claimStatusIp", await clientIp());
}
