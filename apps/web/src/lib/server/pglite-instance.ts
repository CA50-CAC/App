/**
 * The app's one PGlite database (dev and demo only).
 *
 * PGlite allows one open connection per data folder, so the app keeps a single
 * instance for the whole server process. It's stored on `globalThis` because
 * Next's dev server reloads modules on every edit, and a module-level variable
 * would open a second copy and fail.
 */
import "server-only";
import { mkdirSync } from "node:fs";
import path from "node:path";
import type { PGlite } from "@electric-sql/pglite";
import { findRepoRoot } from "@/lib/db/migrations";
import { openPglite } from "@/lib/db/pglite";

const globalForDb = globalThis as unknown as { lostboxPglite?: Promise<PGlite> };

export function pgliteDataDir(): string {
  return path.join(findRepoRoot(), ".data", "pglite");
}

export function getPglite(): Promise<PGlite> {
  if (!globalForDb.lostboxPglite) {
    const dir = pgliteDataDir();
    mkdirSync(path.dirname(dir), { recursive: true });
    globalForDb.lostboxPglite = openPglite(dir).catch((e) => {
      // Don't cache a failure: the next request should try again.
      globalForDb.lostboxPglite = undefined;
      throw e;
    });
  }
  return globalForDb.lostboxPglite;
}
