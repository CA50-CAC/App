/**
 * Opens a PGlite database (real Postgres compiled to WebAssembly, running in
 * Node) and brings it up to date with the migrations.
 *
 * On first open it runs the local auth shim, which fakes the parts of Supabase
 * the migrations depend on. Then it applies each migration once, in order, and
 * records it in `supabase_migrations.schema_migrations`. That's the same table
 * name the Supabase CLI uses on the hosted database, so "which migrations ran
 * here?" has the same answer in both places.
 */
import { PGlite } from "@electric-sql/pglite";
import { readLocalShim, readMigrations } from "./migrations";

/** `dataDir` undefined = in memory (tests). A folder path = saved to disk (dev, demo). */
export async function openPglite(dataDir?: string): Promise<PGlite> {
  const db = await PGlite.create(dataDir);
  await applyMigrations(db);
  return db;
}

export async function applyMigrations(db: PGlite): Promise<string[]> {
  const fresh = (
    await db.query<{ exists: boolean }>(
      "select exists (select 1 from pg_namespace where nspname = 'supabase_migrations') as exists",
    )
  ).rows[0].exists === false;

  if (fresh) {
    await db.transaction(async (tx) => {
      await tx.exec(readLocalShim());
      await tx.exec(`
        create schema supabase_migrations;
        create table supabase_migrations.schema_migrations (version text primary key, name text not null);
      `);
    });
  }

  const applied = new Set(
    (await db.query<{ version: string }>("select version from supabase_migrations.schema_migrations")).rows.map(
      (r) => r.version,
    ),
  );

  const ran: string[] = [];
  for (const m of readMigrations()) {
    if (applied.has(m.version)) continue;
    // One transaction per file: a broken migration leaves nothing half-applied.
    await db.transaction(async (tx) => {
      await tx.exec(m.sql);
      await tx.query("insert into supabase_migrations.schema_migrations (version, name) values ($1, $2)", [
        m.version,
        m.name,
      ]);
    });
    ran.push(`${m.version}_${m.name}`);
  }
  return ran;
}
