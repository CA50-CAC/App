/**
 * Cross-school isolation (CLAUDE.md Section 6): an admin of School A cannot
 * read or modify School B's items, claims, settings, or members.
 *
 * These run against the database itself, so they test the Row Level Security
 * policies and grants in supabase/migrations, not our app code. App code bugs
 * can't weaken them. Run `pnpm test:supabase` to run the same file against the
 * hosted project.
 *
 * Most "can't touch B" checks come with a "can touch A" twin. Without it, a
 * typo in the SQL (or a policy that blocks everyone) would also return zero
 * rows and the test would pass for the wrong reason.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { seedTwoSchools, type SchoolFixture, type TwoSchools } from "./fixtures";
import { openTestDb, type TestDb } from "./harness";

const RLS_DENIED = /row-level security/i;
const NO_PRIVILEGE = /permission denied/i;

let db: TestDb;
let s: TwoSchools;

beforeAll(async () => {
  db = await openTestDb();
  s = await seedTwoSchools(db);
}, 60_000);

afterAll(async () => {
  await db?.close();
});

describe(`tenant isolation (${process.env.TEST_DB ?? "pglite"})`, () => {
  const TENANT_TABLES = [
    ["schools", "id"],
    ["school_members", "school_id"],
    ["staff_invites", "school_id"],
    ["locations", "school_id"],
    ["location_links", "school_id"],
    ["school_categories", "school_id"],
    ["items", "school_id"],
    ["claims", "school_id"],
    ["audit_log", "school_id"],
  ] as const;

  it.each(TENANT_TABLES)("an owner of School A sees A's %s and none of B's", async (table, col) => {
    const rows = await db.asUser(s.a.ownerId, (q) =>
      q(`select ${col} as school_id from public.${table} where ${col} in ($1, $2)`, [s.a.id, s.b.id]),
    );
    expect(rows.length).toBeGreaterThan(0);
    expect(rows.every((r) => r.school_id === s.a.id)).toBe(true);
  });

  it("updates aimed at School B change nothing; the same updates on School A work", async () => {
    const updates = [
      ["update public.schools set name = 'Renamed' where id = $1 returning id", (x: SchoolFixture) => x.id],
      ["update public.items set note = 'changed' where id = $1 returning id", (x: SchoolFixture) => x.itemId],
      ["update public.claims set status = 'rejected' where id = $1 returning id", (x: SchoolFixture) => x.claimId],
      ["update public.locations set name = 'Moved' where id = $1 returning id", (x: SchoolFixture) => x.locationId],
      ["update public.staff_invites set email = 'x@example.com' where id = $1 returning id", (x: SchoolFixture) => x.inviteId],
      ["update public.school_categories set default_visibility = 'staff_only' where school_id = $1 returning school_id", (x: SchoolFixture) => x.id],
    ] as const;

    await db.asUser(s.a.ownerId, async (q) => {
      for (const [sql, pick] of updates) {
        expect(await q(sql, [pick(s.b)]), `B: ${sql}`).toHaveLength(0);
        expect(await q(sql, [pick(s.a)]), `A: ${sql}`).toHaveLength(1);
      }
    });
  });

  it("deletes aimed at School B change nothing", async () => {
    await db.asUser(s.a.ownerId, async (q) => {
      expect(await q("delete from public.school_members where school_id = $1 returning user_id", [s.b.id])).toHaveLength(0);
      expect(await q("delete from public.staff_invites where school_id = $1 returning id", [s.b.id])).toHaveLength(0);
      expect(await q("delete from public.location_links where school_id = $1 returning a", [s.b.id])).toHaveLength(0);
      expect(await q("delete from public.school_categories where school_id = $1 returning school_id", [s.b.id])).toHaveLength(0);
    });
  });

  type Insert = () => [sql: string, params: unknown[]];
  it.each<[string, Insert]>([
    ["items", () => ["insert into public.items (school_id, category, found_location_id, visibility) values ($1, 'keys', $2, 'limited')", [s.b.id, s.b.locationId]]],
    ["locations", () => ["insert into public.locations (school_id, name) values ($1, 'Roof')", [s.b.id]]],
    ["school_members (make myself owner of B)", () => ["insert into public.school_members (school_id, user_id, role) values ($1, $2, 'owner')", [s.b.id, s.a.ownerId]]],
    ["school_categories", () => ["insert into public.school_categories (school_id, category, default_visibility) values ($1, 'keys', 'full')", [s.b.id]]],
    ["staff_invites", () => ["insert into public.staff_invites (school_id, email, token_hash) values ($1, 'spy@example.com', $2)", [s.b.id, `spy-${db.runId}`]]],
    ["audit_log", () => ["insert into public.audit_log (school_id, actor_id, action) values ($1, $2, 'item.removed')", [s.b.id, s.a.ownerId]]],
  ])("an owner of School A can't insert into School B's %s", async (_name, make) => {
    const [sql, params] = make();
    await expect(db.asUser(s.a.ownerId, (q) => q(sql, params))).rejects.toThrow(RLS_DENIED);
  });

  it("staff can add to their own school's audit log, as themselves only", async () => {
    await db.asUser(s.a.staffId, async (q) => {
      const rows = await q("insert into public.audit_log (school_id, actor_id, action) values ($1, $2, 'item.removed') returning id", [
        s.a.id,
        s.a.staffId,
      ]);
      expect(rows).toHaveLength(1);
    });
    await expect(
      db.asUser(s.a.staffId, (q) =>
        q("insert into public.audit_log (school_id, actor_id, action) values ($1, $2, 'item.removed')", [s.a.id, s.a.ownerId]),
      ),
    ).rejects.toThrow(RLS_DENIED);
  });

  it("can't move School A's item into School B", async () => {
    await expect(
      db.asUser(s.a.ownerId, (q) => q("update public.items set school_id = $1 where id = $2", [s.b.id, s.a.itemId])),
    ).rejects.toThrow(NO_PRIVILEGE);
  });

  it("can't hard-delete items or claims, even in their own school", async () => {
    await expect(db.asUser(s.a.ownerId, (q) => q("delete from public.items where id = $1", [s.a.itemId]))).rejects.toThrow(NO_PRIVILEGE);
    await expect(db.asUser(s.a.ownerId, (q) => q("delete from public.claims where id = $1", [s.a.claimId]))).rejects.toThrow(NO_PRIVILEGE);
  });

  it("an owner can't approve their own school", async () => {
    await expect(
      db.asUser(s.a.ownerId, (q) => q("update public.schools set status = 'approved' where id = $1", [s.a.id])),
    ).rejects.toThrow(NO_PRIVILEGE);
  });

  it("staff can't edit the student's claim text", async () => {
    await expect(
      db.asUser(s.a.ownerId, (q) => q("update public.claims set claimant_detail = 'edited' where id = $1", [s.a.claimId])),
    ).rejects.toThrow(NO_PRIVILEGE);
  });

  it("a staff member (not owner) can work items but can't change settings or staff", async () => {
    await db.asUser(s.a.staffId, async (q) => {
      expect(await q("update public.items set note = 'checked' where id = $1 returning id", [s.a.itemId])).toHaveLength(1);
      expect(await q("update public.schools set name = 'Renamed' where id = $1 returning id", [s.a.id])).toHaveLength(0);
      expect(await q("update public.locations set name = 'Moved' where id = $1 returning id", [s.a.locationId])).toHaveLength(0);
    });
    await expect(
      db.asUser(s.a.staffId, (q) =>
        q("update public.school_members set role = 'owner' where school_id = $1 and user_id = $2", [s.a.id, s.a.staffId]),
      ),
    ).rejects.toThrow(NO_PRIVILEGE);
  });

  it("an invite for School B can't be accepted by someone it wasn't sent to", async () => {
    const [row] = await db.asUser(s.a.ownerId, (q) => q("select public.accept_staff_invite($1) as school_id", [`invite-${db.runId}-b`]));
    expect(row.school_id).toBeNull();
  });

  it("a signed-in user who creates a school starts pending, as its owner", async () => {
    await db.asUser(s.a.ownerId, async (q) => {
      const [{ id }] = await q("select public.create_school($1, 'New School', null, 'America/Los_Angeles', null, $2, false) as id", [
        `zz-test-${db.runId}-new`,
        `N${db.runId.toUpperCase()}`,
      ]);
      const [school] = await q("select status from public.schools where id = $1", [id]);
      expect(school.status).toBe("pending_review");
      const [member] = await q("select role from public.school_members where school_id = $1 and user_id = $2", [id, s.a.ownerId]);
      expect(member.role).toBe("owner");
    });
  });

  it("visitors who aren't signed in can't read tables, the student view, or create schools", async () => {
    await expect(db.asAnon((q) => q("select id from public.items"))).rejects.toThrow(NO_PRIVILEGE);
    await expect(db.asAnon((q) => q("select id from public.student_items"))).rejects.toThrow(NO_PRIVILEGE);
    await expect(
      db.asAnon((q) => q("select public.create_school('x', 'X School', null, 'UTC', null, 'XXXXXXXX', false)")),
    ).rejects.toThrow(NO_PRIVILEGE);
  });

  it("signed-in staff can't read the student view directly either (the server reads it for students)", async () => {
    await expect(db.asUser(s.a.ownerId, (q) => q("select id from public.student_items"))).rejects.toThrow(NO_PRIVILEGE);
  });
});
