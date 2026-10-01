/**
 * Join codes and claim codes.
 *
 * Both use an alphabet without look-alike characters (no 0/O, 1/I/L), so a code
 * read off a poster or a phone screen is hard to mistype.
 *
 * We pick each character with "rejection sampling": take a random byte, and if
 * it falls in the uneven leftover range at the top, throw it away and draw again.
 * Plain `byte % 31` would make the first few letters slightly more likely.
 *
 * Claim codes are only stored as a SHA-256 hash, like a password. They are long
 * and random, so a fast hash is enough here (no need for bcrypt).
 */

export const CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
export const JOIN_CODE_LENGTH = 8;
export const CLAIM_CODE_LENGTH = 10;

/** The demo school's fixed, documented join code. Real schools get random codes. */
export const DEMO_JOIN_CODE = "DEMO2026";

export function randomCode(length: number, alphabet = CODE_ALPHABET): string {
  const limit = 256 - (256 % alphabet.length);
  let out = "";
  while (out.length < length) {
    const bytes = crypto.getRandomValues(new Uint8Array(length * 2));
    for (const b of bytes) {
      if (b < limit) out += alphabet[b % alphabet.length];
      if (out.length === length) break;
    }
  }
  return out;
}

export function generateJoinCode(): string {
  return randomCode(JOIN_CODE_LENGTH);
}

/** Uppercase and remove spaces and dashes so "demo-2026" and " DEMO 2026" both work. */
export function normalizeCode(input: string): string {
  return input.toUpperCase().replace(/[\s-]/g, "");
}

/** Claim codes are shown as two groups of five, e.g. "K7PQX-M2RTA". */
export function generateClaimCode(): string {
  const raw = randomCode(CLAIM_CODE_LENGTH);
  return `${raw.slice(0, 5)}-${raw.slice(5)}`;
}

export async function hashCode(code: string): Promise<string> {
  const data = new TextEncoder().encode(normalizeCode(code));
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
}

/** "Demo High School!" -> "demo-high-school" */
export function slugify(name: string): string {
  return (
    name
      .normalize("NFKD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 48)
      .replace(/-+$/g, "") || "school"
  );
}
