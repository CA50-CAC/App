/**
 * Turns database errors into RepoError codes, so pages can show a friendly
 * message ("that web address is taken") without knowing Postgres error codes.
 * Used by both adapters: PGlite errors and Supabase API errors both carry the
 * Postgres SQLSTATE in `code`.
 */
import { RepoError } from "./interface";

const BY_SQLSTATE: Record<string, RepoError["code"]> = {
  "23505": "conflict", // unique_violation: slug taken, duplicate location name
  "23503": "conflict", // foreign_key_violation: location still used by items
  "23514": "invalid", // check_violation: too long, wallet set to Full, ...
  "22P02": "invalid", // invalid_text_representation: bad uuid or enum value
  "22001": "invalid", // string_data_right_truncation
  "23502": "invalid", // not_null_violation
  "42501": "forbidden", // insufficient_privilege, including "violates row-level security policy"
};

export function mapPgError(e: unknown): unknown {
  if (e instanceof RepoError) return e;
  const err = e as { code?: unknown; message?: unknown } | null;
  const code = typeof err?.code === "string" ? BY_SQLSTATE[err.code] : undefined;
  if (!code) return e;
  const out = new RepoError(code, typeof err?.message === "string" ? err.message : code);
  (out as { cause?: unknown }).cause = e;
  return out;
}
