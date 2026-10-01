/**
 * Guards against the classic Supabase mistake: a new table or function that's
 * quietly open to the public API.
 *
 * On Supabase, `anon` and `authenticated` get access to new objects in `public`
 * by default (the local shim copies that). These tests inspect the database
 * catalog and fail if:
 *   - any table is missing Row Level Security
 *   - `anon` (not signed in) can touch anything at all
 *   - `authenticated` has table privileges or functions we didn't list here
 *
 * If you add a table or grant on purpose, update the expected lists below. That
 * makes every widening of access a visible, reviewed change.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { openTestDb, type TestDb } from "./harness";

let db: TestDb;

beforeAll(async () => {
  db = await openTestDb();
}, 60_000);

afterAll(async () => {
  await db?.close();
});

const PRIVILEGES = ["SELECT", "INSERT", "UPDATE", "DELETE", "TRUNCATE", "REFERENCES", "TRIGGER"];

/** Table-level privileges `authenticated` should have. Column-level UPDATE grants aren't listed here. */
const AUTHENTICATED_TABLE_PRIVILEGES: Record<string, string[]> = {
  audit_log: ["INSERT", "SELECT"],
  claims: ["SELECT"],
  items: ["INSERT", "SELECT"],
  location_links: ["DELETE", "INSERT", "SELECT"],
  locations: ["DELETE", "INSERT", "SELECT", "UPDATE"],
  school_categories: ["DELETE", "INSERT", "SELECT", "UPDATE"],
  school_members: ["DELETE", "INSERT", "SELECT"],
  schools: ["SELECT"],
  staff_invites: ["DELETE", "INSERT", "SELECT", "UPDATE"],
};

const AUTHENTICATED_FUNCTIONS = ["accept_staff_invite", "create_school", "is_member", "is_owner"];

async function tablePrivileges(role: string): Promise<Record<string, string[]>> {
  const rows = await db.owner(
    `select c.relname as name, p.priv
       from pg_class c
       join pg_namespace n on n.oid = c.relnamespace
       cross join unnest($2::text[]) as p(priv)
      where n.nspname = 'public' and c.relkind in ('r', 'p', 'v', 'm', 'f')
        and has_table_privilege($1, c.oid, p.priv)
      order by 1, 2`,
    [role, PRIVILEGES],
  );
  const out: Record<string, string[]> = {};
  for (const r of rows) (out[r.name as string] ??= []).push(r.priv as string);
  return out;
}

async function executableFunctions(role: string): Promise<string[]> {
  const rows = await db.owner(
    `select distinct p.proname as name
       from pg_proc p join pg_namespace n on n.oid = p.pronamespace
      where n.nspname = 'public' and has_function_privilege($1, p.oid, 'EXECUTE')
      order by 1`,
    [role],
  );
  return rows.map((r) => r.name as string);
}

describe(`schema guard (${process.env.TEST_DB ?? "pglite"})`, () => {
  it("every table in public has Row Level Security turned on", async () => {
    const rows = await db.owner(
      `select c.relname as name from pg_class c join pg_namespace n on n.oid = c.relnamespace
        where n.nspname = 'public' and c.relkind in ('r', 'p') and not c.relrowsecurity`,
    );
    expect(rows.map((r) => r.name)).toEqual([]);
  });

  it("anon has no privileges on any table, view, or sequence", async () => {
    expect(await tablePrivileges("anon")).toEqual({});
    const seqs = await db.owner(
      `select c.relname as name from pg_class c join pg_namespace n on n.oid = c.relnamespace
        where n.nspname = 'public'
          -- CASE so the privilege check only ever sees sequences
          and case when c.relkind = 'S' then has_sequence_privilege('anon', c.oid, 'USAGE,SELECT,UPDATE') else false end`,
    );
    expect(seqs.map((r) => r.name)).toEqual([]);
  });

  it("anon can't run any function in public", async () => {
    expect(await executableFunctions("anon")).toEqual([]);
  });

  it("authenticated has exactly the expected table privileges", async () => {
    expect(await tablePrivileges("authenticated")).toEqual(AUTHENTICATED_TABLE_PRIVILEGES);
  });

  it("authenticated can run exactly the expected functions", async () => {
    expect(await executableFunctions("authenticated")).toEqual(AUTHENTICATED_FUNCTIONS);
  });
});
