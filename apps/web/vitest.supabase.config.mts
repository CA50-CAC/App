/**
 * `pnpm test:supabase`: runs the database tests (tests/db) against the hosted
 * Supabase project instead of PGlite. Opt-in only; CI never runs this, so CI
 * needs no secrets or network.
 *
 * Reads SUPABASE_TEST_* from apps/web/.env.local. See .env.example.
 */
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { parseEnv } from "node:util";
import { defineConfig } from "vitest/config";

const envFile = fileURLToPath(new URL("./.env.local", import.meta.url));
const fileEnv = existsSync(envFile) ? parseEnv(readFileSync(envFile, "utf8")) : {};

export default defineConfig({
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  test: {
    environment: "node",
    include: ["tests/db/**/*.test.ts"],
    env: { ...(fileEnv as Record<string, string>), TEST_DB: "supabase" },
    // One file at a time: both share the one hosted database.
    fileParallelism: false,
    testTimeout: 30_000,
  },
});
