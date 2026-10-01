/**
 * One test database interface, two backends.
 *
 * - TEST_DB unset (default, CI): a fresh in-memory PGlite per test file, with
 *   the local auth shim and our migrations applied. No network, no secrets.
 * - TEST_DB=supabase (`pnpm test:supabase`): the hosted Supabase project. Same
 *   tests, but now against the real auth.uid(), the real roles, and the real
 *   default privileges. This is how we know the local tests check what's
 *   actually deployed.
 *
 * Every "act as someone" call runs inside a transaction that is always rolled
 * back, so tests can't leave changes behind. Fixtures created with `owner` do
 * persist; on Supabase they're tagged with a `zz-test-` slug and deleted by
 * `close()`.
 */
import { randomBytes } from "node:crypto";
import type { PGlite } from "@electric-sql/pglite";
import { openPglite } from "@/lib/db/pglite";

export type Row = Record<string, unknown>;
export type Query = (text: string, params?: unknown[]) => Promise<Row[]>;

export interface TestDb {
  readonly target: "pglite" | "supabase";
  /** Unique per run. Use it in slugs and emails so parallel runs don't collide. */
  readonly runId: string;
  /** The database owner. Bypasses RLS. Only for setting up fixtures and inspecting the schema. */
  owner: Query;
  /** Runs `fn` as a signed-in staff user: role `authenticated`, auth.uid() = userId. Always rolled back. */
  asUser<T>(userId: string, fn: (q: Query) => Promise<T>): Promise<T>;
  /** Runs `fn` as a visitor who isn't signed in: role `anon`. Always rolled back. */
  asAnon<T>(fn: (q: Query) => Promise<T>): Promise<T>;
  createUser(email: string): Promise<string>;
  close(): Promise<void>;
}

/** Fixtures on a shared database get this slug prefix so they can be found and cleaned up. */
export const TEST_SLUG_PREFIX = "zz-test-";

export async function openTestDb(): Promise<TestDb> {
  return process.env.TEST_DB === "supabase" ? openSupabase() : openLocal();
}

// The database connection is a single session, so begin/rollback wrap exactly
// the queries `fn` runs. Postgres keeps going after a failed statement only
// until we roll back, which we always do.
async function inRole<T>(q: Query, role: "authenticated" | "anon", sub: string | null, fn: (q: Query) => Promise<T>) {
  await q("begin");
  try {
    await q(`set local role ${role}`);
    const claims = sub ? { sub, role } : { role };
    await q("select set_config('request.jwt.claims', $1, true)", [JSON.stringify(claims)]);
    return await fn(q);
  } finally {
    await q("rollback");
  }
}

async function openLocal(): Promise<TestDb> {
  const db: PGlite = await openPglite();
  const owner: Query = async (text, params) => (await db.query<Row>(text, params)).rows;
  return {
    target: "pglite",
    runId: randomBytes(4).toString("hex"),
    owner,
    asUser: (userId, fn) => inRole(owner, "authenticated", userId, fn),
    asAnon: (fn) => inRole(owner, "anon", null, fn),
    async createUser(email) {
      const [row] = await owner("insert into auth.users (email) values ($1) returning id", [email]);
      return row.id as string;
    },
    close: () => db.close(),
  };
}

async function openSupabase(): Promise<TestDb> {
  // Separate variables from the app's own, so tests can point at a separate
  // test project without any chance of mixing the two up.
  const dbUrl = process.env.SUPABASE_TEST_DB_URL;
  const apiUrl = process.env.SUPABASE_TEST_API_URL;
  const secretKey = process.env.SUPABASE_TEST_SECRET_KEY;
  if (!dbUrl || !apiUrl || !secretKey) {
    throw new Error(
      "pnpm test:supabase needs SUPABASE_TEST_DB_URL, SUPABASE_TEST_API_URL, and SUPABASE_TEST_SECRET_KEY in apps/web/.env.local",
    );
  }

  // Loaded lazily so the default (PGlite) test run never touches these packages.
  const { default: postgres } = await import("postgres");
  const { createClient } = await import("@supabase/supabase-js");

  // max: 1 keeps every query on one connection, so begin/rollback line up.
  // prepare: false is required by Supabase's connection pooler.
  const sql = postgres(dbUrl, { max: 1, prepare: false, onnotice: () => {} });
  const owner: Query = async (text, params = []) => [...(await sql.unsafe(text, params as never[]))] as Row[];

  // Users live in Supabase Auth, so they're created through its admin API
  // rather than by writing to auth.users directly.
  const admin = createClient(apiUrl, secretKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const runId = randomBytes(4).toString("hex");
  const userIds: string[] = [];

  return {
    target: "supabase",
    runId,
    owner,
    asUser: (userId, fn) => inRole(owner, "authenticated", userId, fn),
    asAnon: (fn) => inRole(owner, "anon", null, fn),
    async createUser(email) {
      const { data, error } = await admin.auth.admin.createUser({ email, email_confirm: true });
      if (error || !data.user) throw new Error(`Couldn't create test user ${email}: ${error?.message}`);
      userIds.push(data.user.id);
      return data.user.id;
    },
    async close() {
      try {
        await owner("delete from public.schools where slug like $1", [`${TEST_SLUG_PREFIX}${runId}-%`]);
        for (const id of userIds) await admin.auth.admin.deleteUser(id);
      } finally {
        await sql.end();
      }
    },
  };
}
