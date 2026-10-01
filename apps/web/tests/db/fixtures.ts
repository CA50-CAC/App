/**
 * Two schools with a bit of everything, created as the database owner.
 *
 * School A has an owner and a staff member; School B has an owner. Tests then
 * act as those users and check what Row Level Security lets them see and do.
 */
import { TEST_SLUG_PREFIX, type TestDb } from "./harness";

export interface SchoolFixture {
  id: string;
  ownerId: string;
  locationId: string;
  itemId: string;
  claimId: string;
  inviteId: string;
}

export interface TwoSchools {
  a: SchoolFixture & { staffId: string };
  b: SchoolFixture;
}

async function seedSchool(db: TestDb, key: "a" | "b", ownerId: string): Promise<SchoolFixture> {
  const tag = `${db.runId}-${key}`;
  const q = db.owner;

  const [school] = await q(
    `insert into public.schools (slug, name, join_code, status, setup_step, created_by)
     values ($1, $2, $3, 'approved', 7, $4) returning id`,
    [`${TEST_SLUG_PREFIX}${tag}`, `Test School ${key.toUpperCase()}`, `T${db.runId.toUpperCase()}${key.toUpperCase()}`, ownerId],
  );
  const schoolId = school.id as string;

  await q("insert into public.school_members (school_id, user_id, role) values ($1, $2, 'owner')", [schoolId, ownerId]);

  const [gym] = await q("insert into public.locations (school_id, name, sort) values ($1, 'Gym', 0) returning id", [schoolId]);
  const [library] = await q("insert into public.locations (school_id, name, sort) values ($1, 'Library', 1) returning id", [
    schoolId,
  ]);
  const [a, b] = [gym.id as string, library.id as string].sort();
  await q("insert into public.location_links (school_id, a, b) values ($1, $2, $3)", [schoolId, a, b]);

  await q("insert into public.school_categories (school_id, category, default_visibility) values ($1, 'electronics', 'limited')", [
    schoolId,
  ]);

  const [item] = await q(
    `insert into public.items (school_id, category, colors, note, found_location_id, visibility, owner_hint, photo_path)
     values ($1, 'bottle_lunchbox', '{black}', 'Dented near the lid', $2, 'full', 'Name label: J.', $3) returning id`,
    [schoolId, gym.id, `${schoolId}/bottle.jpg`],
  );

  const [claim] = await q(
    `insert into public.claims (school_id, item_id, claimant_detail, code_hash)
     values ($1, $2, 'Sticker of a fox on the bottom', $3) returning id`,
    [schoolId, item.id, `claim-${tag}`],
  );

  const [invite] = await q(
    `insert into public.staff_invites (school_id, email, token_hash, created_by)
     values ($1, $2, $3, $4) returning id`,
    [schoolId, `${TEST_SLUG_PREFIX}${tag}-invitee@example.com`, `invite-${tag}`, ownerId],
  );

  await q("insert into public.audit_log (school_id, actor_id, action, item_id) values ($1, $2, 'item.created', $3)", [
    schoolId,
    ownerId,
    item.id,
  ]);

  return {
    id: schoolId,
    ownerId,
    locationId: gym.id as string,
    itemId: item.id as string,
    claimId: claim.id as string,
    inviteId: invite.id as string,
  };
}

export async function seedTwoSchools(db: TestDb): Promise<TwoSchools> {
  const email = (who: string) => `${TEST_SLUG_PREFIX}${db.runId}-${who}@example.com`;
  const [ownerA, staffA, ownerB] = [
    await db.createUser(email("owner-a")),
    await db.createUser(email("staff-a")),
    await db.createUser(email("owner-b")),
  ];

  const a = await seedSchool(db, "a", ownerA);
  const b = await seedSchool(db, "b", ownerB);
  await db.owner("insert into public.school_members (school_id, user_id, role) values ($1, $2, 'staff')", [a.id, staffA]);

  return { a: { ...a, staffId: staffA }, b };
}
