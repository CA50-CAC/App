/**
 * Finds the SQL migrations in `supabase/migrations/`.
 *
 * There is one set of migration files and two ways they get applied:
 * - Hosted Supabase: the Supabase CLI (`pnpm db:push`). It records what it
 *   applied in its own table, so the hosted database can't silently drift.
 * - PGlite (tests, demo): `applyMigrations()` in ./pglite.ts, which reads the
 *   same files through this module.
 *
 * File names must match the Supabase CLI's rule, `<number>_<name>.sql`,
 * otherwise the CLI skips the file. We keep them zero-padded (0001, 0002, ...)
 * so sorting by name is also sorting by order.
 */
import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";

/** The same pattern the Supabase CLI uses (checked against CLI v2.118). */
const MIGRATION_FILE = /^([0-9]+)_(.*)\.sql$/;

export interface Migration {
  version: string;
  name: string;
  sql: string;
}

/** Walks up from `start` to the folder that holds pnpm-workspace.yaml. */
export function findRepoRoot(start = process.cwd()): string {
  let dir = path.resolve(start);
  while (!existsSync(path.join(dir, "pnpm-workspace.yaml"))) {
    const parent = path.dirname(dir);
    if (parent === dir) throw new Error(`Couldn't find the repo root above ${start}`);
    dir = parent;
  }
  return dir;
}

export function readMigrations(root = findRepoRoot()): Migration[] {
  const dir = path.join(root, "supabase", "migrations");
  return readdirSync(dir)
    .filter((file) => MIGRATION_FILE.test(file))
    .sort()
    .map((file) => {
      const [, version, name] = MIGRATION_FILE.exec(file)!;
      return { version, name, sql: readFileSync(path.join(dir, file), "utf8") };
    });
}

/** Stand-ins for Supabase's auth schema and roles. PGlite only; never run on Supabase. */
export function readLocalShim(root = findRepoRoot()): string {
  return readFileSync(path.join(root, "supabase", "local", "auth_shim.sql"), "utf8");
}
