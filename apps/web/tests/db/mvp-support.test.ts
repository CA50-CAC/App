/**
 * Database rules added in 0002_mvp_support.sql. Runs on PGlite by default and
 * on the hosted project with `pnpm test:supabase`.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { seedTwoSchools, type TwoSchools } from "./fixtures";
import { openTestDb, type TestDb } from "./harness";

let db: TestDb;
let s: TwoSchools;

beforeAll(async () => {
  db = await openTestDb();
  s = await seedTwoSchools(db);
}, 60_000);

afterAll(async () => {
  await db?.close();
});

describe(`0002 MVP support (${process.env.TEST_DB ?? "pglite"})`, () => {
  describe("private staff notes", () => {
    it("staff can write a private note on their own school's item", async () => {
      const rows = await db.asUser(s.a.staffId, (q) =>
        q("update public.items set staff_note = 'Blue case' where id = $1 returning staff_note", [s.a.itemId]),
      );
      expect(rows).toEqual([{ staff_note: "Blue case" }]);
    });

    it("the student view has no staff_note column at all", async () => {
      const cols = await db.owner(
        `select column_name from information_schema.columns
          where table_schema = 'public' and table_name = 'student_items' order by column_name`,
      );
      const names = cols.map((c) => c.column_name);
      expect(names).not.toContain("staff_note");
      expect(names).not.toContain("owner_hint");
    });
  });

  describe("photo paths", () => {
    it("an item can't point at a photo in another school's folder", async () => {
      await expect(
        db.asUser(s.a.ownerId, (q) =>
          q("update public.items set photo_path = $1 where id = $2", [`${s.b.id}/stolen.jpg`, s.a.itemId]),
        ),
      ).rejects.toThrow(/photo_in_school_folder/);
    });

    it("a photo in the item's own school folder is fine", async () => {
      const rows = await db.asUser(s.a.ownerId, (q) =>
        q("update public.items set photo_path = $1 where id = $2 returning id", [`${s.a.id}/new.jpg`, s.a.itemId]),
      );
      expect(rows).toHaveLength(1);
    });
  });

  describe("hit_rate_limit", () => {
    it("allows up to the limit in one window, then refuses", async () => {
      const key = `test:${db.runId}:${Math.random()}`;
      const results: boolean[] = [];
      for (let i = 0; i < 4; i++) {
        const [row] = await db.owner("select public.hit_rate_limit($1, 3, 60) as ok", [key]);
        results.push(row.ok as boolean);
      }
      expect(results).toEqual([true, true, true, false]);
      await db.owner("delete from public.rate_limits where key = $1", [key]);
    });

    it("starts a new window once the old one has passed", async () => {
      const key = `test:${db.runId}:${Math.random()}`;
      await db.owner("select public.hit_rate_limit($1, 1, 60)", [key]);
      await db.owner("update public.rate_limits set window_start = now() - interval '2 minutes' where key = $1", [key]);
      const [row] = await db.owner("select public.hit_rate_limit($1, 1, 60) as ok", [key]);
      expect(row.ok).toBe(true);
      await db.owner("delete from public.rate_limits where key = $1", [key]);
    });

    it("signed-in users can't call it", async () => {
      await expect(db.asUser(s.a.ownerId, (q) => q("select public.hit_rate_limit('x', 1, 60)"))).rejects.toThrow(
        /permission denied/i,
      );
    });
  });

  describe("list_school_members", () => {
    it("a member gets their school's members with emails", async () => {
      const rows = await db.asUser(s.a.staffId, (q) => q("select * from public.list_school_members($1)", [s.a.id]));
      expect(rows.map((r) => r.user_id).sort()).toEqual([s.a.ownerId, s.a.staffId].sort());
      expect(rows.every((r) => typeof r.email === "string" && (r.email as string).includes("@"))).toBe(true);
    });

    it("asking about another school returns nothing", async () => {
      const rows = await db.asUser(s.a.ownerId, (q) => q("select * from public.list_school_members($1)", [s.b.id]));
      expect(rows).toEqual([]);
    });
  });
});
