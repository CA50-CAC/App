import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { PGlite } from "@electric-sql/pglite";
import { openPglite } from "@/lib/db/pglite";
import { createLocalMagicToken, redeemLocalMagicToken } from "./local-links";

let db: PGlite;
beforeAll(async () => {
  db = await openPglite();
}, 60_000);
afterAll(async () => {
  await db?.close();
});

describe("local magic links", () => {
  it("a token signs in once, creating the user by email", async () => {
    const token = await createLocalMagicToken(db, "  Teacher@School.org ");
    const first = await redeemLocalMagicToken(db, token);
    expect(first).toMatchObject({ email: "teacher@school.org" });
    expect(await redeemLocalMagicToken(db, token)).toBeNull();
  });

  it("the same email always maps to the same user", async () => {
    const a = await redeemLocalMagicToken(db, await createLocalMagicToken(db, "same@school.org"));
    const b = await redeemLocalMagicToken(db, await createLocalMagicToken(db, "SAME@school.org"));
    expect(a?.userId).toBe(b?.userId);
  });

  it("stores only a hash of the token", async () => {
    const token = await createLocalMagicToken(db, "hash@school.org");
    const { rows } = await db.query<{ token_hash: string }>("select token_hash from auth.magic_links where email = 'hash@school.org'");
    expect(rows[0].token_hash).not.toContain(token);
    expect(rows[0].token_hash).toMatch(/^[0-9a-f]{64}$/);
  });

  it("expired and unknown tokens don't work", async () => {
    const token = await createLocalMagicToken(db, "late@school.org");
    await db.query("update auth.magic_links set expires_at = now() - interval '1 minute' where email = 'late@school.org'");
    expect(await redeemLocalMagicToken(db, token)).toBeNull();
    expect(await redeemLocalMagicToken(db, "not-a-real-token")).toBeNull();
    expect(await redeemLocalMagicToken(db, "")).toBeNull();
  });

  it("tokens are case-sensitive", async () => {
    const token = await createLocalMagicToken(db, "case@school.org");
    const flipped = token.replace(/[a-z]/, (c) => c.toUpperCase());
    if (flipped !== token) expect(await redeemLocalMagicToken(db, flipped)).toBeNull();
    expect(await redeemLocalMagicToken(db, token)).not.toBeNull();
  });
});
