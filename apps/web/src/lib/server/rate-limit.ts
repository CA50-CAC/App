/**
 * Rate limits for everything a stranger can trigger. Counts live in the
 * database (public.rate_limits via hit_rate_limit), so they hold across
 * server restarts and, on Vercel, across machines.
 *
 * Keys are hashed, so the table holds no raw IP addresses or emails.
 */
import "server-only";
import { createHash } from "node:crypto";
import { headers } from "next/headers";
import { repos } from "./repos";

export const LIMITS = {
  /** Sign-in emails from one network. */
  magicLinkIp: { limit: 10, windowSeconds: 15 * 60 },
  /** Sign-in emails to one address. */
  magicLinkEmail: { limit: 5, windowSeconds: 60 * 60 },
  /** Join code guesses from one network. Codes have ~40 bits, so this makes guessing hopeless. */
  joinIp: { limit: 20, windowSeconds: 10 * 60 },
  /** Claims submitted from one network. */
  claimIp: { limit: 10, windowSeconds: 60 * 60 },
  /** Claims for one item (stops one item being flooded). */
  claimItem: { limit: 20, windowSeconds: 24 * 60 * 60 },
  /** Claim status lookups from one network. */
  claimStatusIp: { limit: 30, windowSeconds: 10 * 60 },
  /** New schools per signed-in user. */
  createSchoolUser: { limit: 3, windowSeconds: 24 * 60 * 60 },
  /** Staff invites per school. */
  inviteSchool: { limit: 30, windowSeconds: 24 * 60 * 60 },
  /** Photo uploads per staff member. */
  uploadUser: { limit: 120, windowSeconds: 60 * 60 },
} as const;

export type LimitName = keyof typeof LIMITS;

export function rateLimitKey(name: LimitName, subject: string): string {
  return `${name}:${createHash("sha256").update(subject).digest("hex").slice(0, 32)}`;
}

/** True if allowed. Every call counts as one attempt. */
export async function allow(name: LimitName, subject: string): Promise<boolean> {
  const { limit, windowSeconds } = LIMITS[name];
  return (await repos()).system().hitRateLimit(rateLimitKey(name, subject), limit, windowSeconds);
}

/** The caller's IP as reported by the host (Vercel sets x-forwarded-for). */
export async function clientIp(): Promise<string> {
  const h = await headers();
  return h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "unknown";
}
