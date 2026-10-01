/**
 * Where local data lives: the PGlite database and uploaded photos.
 * Default: <repo>/.data. LOSTBOX_DATA_DIR points somewhere else (the
 * end-to-end tests use their own folder so they never touch your dev data).
 */
import path from "node:path";
import { findRepoRoot } from "./migrations";

export function dataDir(): string {
  const custom = process.env.LOSTBOX_DATA_DIR;
  return custom ? path.resolve(findRepoRoot(), custom) : path.join(findRepoRoot(), ".data");
}

export const pgliteDir = () => path.join(dataDir(), "pglite");
export const uploadsDir = () => path.join(dataDir(), "uploads");
