/**
 * `pnpm seed:demo`: creates (or resets) Demo High School in the local PGlite
 * database under .data/. Join code: DEMO2026. Staff sign-in: demo@lostbox.test.
 *
 * Stop `pnpm dev` first: PGlite allows one process per database folder. While
 * the app is running, use the "Reset demo data" button in /admin instead.
 */
import { mkdirSync } from "node:fs";
import path from "node:path";
import { pgliteDir, uploadsDir } from "../src/lib/db/data-dir";
import { openPglite } from "../src/lib/db/pglite";
import { DEMO_JOIN_CODE, DEMO_STAFF_EMAIL } from "../src/lib/demo/constants";
import { seedDemo } from "../src/lib/demo/seed";

async function main() {
  if (process.env.DATA_ADAPTER === "supabase") {
    console.error("seed:demo only seeds the local PGlite database. Unset DATA_ADAPTER (or set it to pglite).");
    process.exit(1);
  }
  const dir = pgliteDir();
  mkdirSync(path.dirname(dir), { recursive: true });
  const db = await openPglite(dir);
  try {
    const { items } = await seedDemo(db, uploadsDir());
    console.log(`Demo High School is ready with ${items} items.`);
    console.log(`  Students: open http://localhost:3000 and enter ${DEMO_JOIN_CODE}`);
    console.log(`  Staff:    sign in at http://localhost:3000/login as ${DEMO_STAFF_EMAIL}`);
  } finally {
    await db.close();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
