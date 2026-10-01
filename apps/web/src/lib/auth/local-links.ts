/**
 * Magic links for the local (PGlite) prototype.
 *
 * Supabase Auth does this for us in production. Locally there is no email, so:
 * 1. We make a long random token, store only its SHA-256 hash in
 *    auth.magic_links (the local shim's table), and return the link so the
 *    page can show it on screen.
 * 2. Opening the link redeems the token once: it must exist, be unused, and be
 *    less than 15 minutes old. Then the user is found or created by email.
 *
 * Kept free of Next.js imports so it can be tested directly.
 */
import { randomBytes } from "node:crypto";
import type { PGlite } from "@electric-sql/pglite";
import { normalizeEmail } from "./provider";

export const LINK_TTL_MINUTES = 15;

async function hashToken(token: string): Promise<string> {
  // Not hashCode() from codes.ts: that one upper-cases its input (it's built
  // for join and claim codes), which would weaken a case-sensitive token.
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(token));
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
}

export async function createLocalMagicToken(db: PGlite, email: string): Promise<string> {
  const token = randomBytes(32).toString("base64url");
  await db.query(
    `insert into auth.magic_links (token_hash, email, expires_at)
     values ($1, $2, now() + make_interval(mins => $3))`,
    [await hashToken(token), normalizeEmail(email), LINK_TTL_MINUTES],
  );
  return token;
}

/** Returns the signed-in user, or null if the token is unknown, used, or expired. */
export async function redeemLocalMagicToken(db: PGlite, token: string): Promise<{ userId: string; email: string } | null> {
  if (!token || token.length > 200) return null;
  const hash = await hashToken(token);
  return db.transaction(async (tx) => {
    const { rows } = await tx.query<{ email: string }>(
      `update auth.magic_links set used_at = now()
        where token_hash = $1 and used_at is null and expires_at > now()
        returning email`,
      [hash],
    );
    if (rows.length === 0) return null;
    const email = rows[0].email;
    const user = await tx.query<{ id: string }>(
      `insert into auth.users (email) values ($1)
       on conflict (email) do update set email = excluded.email
       returning id`,
      [email],
    );
    return { userId: user.rows[0].id, email };
  });
}
