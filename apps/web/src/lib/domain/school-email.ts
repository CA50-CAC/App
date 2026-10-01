/**
 * Does an email address look like it belongs to a school?
 *
 * Only a hint. Many schools use unusual domains, so a "no" never blocks
 * signup: it just flags the school for a closer look by a platform admin
 * (schools.needs_manual_review).
 */
const SCHOOL_PATTERNS = [/\.edu$/, /\.k12\.[a-z]{2}\.us$/, /(^|[.-])k12[.-]/, /(isd|usd)\.[a-z]+$/, /school/, /academy/];
const FREE_MAIL = new Set(["gmail.com", "yahoo.com", "outlook.com", "hotmail.com", "icloud.com", "aol.com", "proton.me", "protonmail.com"]);

export function looksLikeSchoolEmail(email: string): boolean {
  const domain = email.trim().toLowerCase().split("@")[1] ?? "";
  if (!domain || FREE_MAIL.has(domain)) return false;
  return SCHOOL_PATTERNS.some((p) => p.test(domain));
}
