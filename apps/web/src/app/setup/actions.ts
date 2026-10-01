"use server";

/**
 * Server actions for school setup. The wizard (/setup/N) and the settings page
 * (/admin/settings) use the same actions and the same form components; a
 * hidden `mode` field says whether to move on to the next wizard step or stay
 * on the settings page.
 *
 * Every action checks who is signed in. Owner-only rules (who may change
 * settings, invite, rotate the code) are enforced again by Row Level Security.
 */
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { isAllowedVisibility, type CategoryDefaults } from "@/lib/domain/categories";
import { slugify } from "@/lib/domain/codes";
import { looksLikeSchoolEmail } from "@/lib/domain/school-email";
import { CATEGORIES, VISIBILITIES, type Visibility } from "@/lib/domain/types";
import {
  InviteSchema,
  LocationNamesSchema,
  PoliciesSchema,
  SchoolProfileSchema,
  fieldErrors,
} from "@/lib/domain/validation";
import { appEnv } from "@/lib/env";
import { RepoError, type StaffRepo } from "@/lib/repo/interface";
import { asMessageKeys, type FormState } from "@/lib/server/forms";
import { allow } from "@/lib/server/rate-limit";
import { repos } from "@/lib/server/repos";
import { SCHOOL_COOKIE } from "@/lib/server/staff-context";
import { newLinkToken, sha256Hex } from "@/lib/server/tokens";
import { getWizardContext } from "@/lib/server/wizard";

type Mode = "wizard" | "settings";

function modeOf(form: FormData): Mode {
  return form.get("mode") === "settings" ? "settings" : "wizard";
}

/** After a successful save: next wizard step, or stay on settings with a "Saved" message. */
async function done(mode: Mode, repo: StaffRepo, schoolId: string, step: number): Promise<FormState> {
  if (mode === "settings") {
    revalidatePath("/admin", "layout");
    return { ok: true };
  }
  await repo.setSetupStep(schoolId, step);
  redirect(`/setup/${step + 1}`);
}

async function pickFreeSlug(name: string): Promise<string | null> {
  const system = (await repos()).system();
  const base = slugify(name).slice(0, 44);
  for (let i = 1; i <= 20; i++) {
    const slug = i === 1 ? base : `${base}-${i}`;
    if (!(await system.isSlugTaken(slug))) return slug;
  }
  return null;
}

// ---------- Step 2: school profile ----------

export async function saveSchoolProfile(_prev: FormState, form: FormData): Promise<FormState> {
  const mode = modeOf(form);
  const { session, repo, school } = await getWizardContext(2);
  if (form.get("website")) return { ok: true }; // honeypot

  const parsed = SchoolProfileSchema.safeParse({
    name: form.get("name"),
    district: form.get("district") ?? undefined,
    timeZone: form.get("timeZone"),
  });
  if (!parsed.success) return { errors: asMessageKeys(fieldErrors(parsed.error)) };
  const profile = { ...parsed.data, logoPath: school?.logoPath ?? null };

  if (school) {
    await repo.updateProfile(school.id, profile);
    return done(mode, repo, school.id, 2);
  }

  if (!(await allow("createSchoolUser", session.userId))) return { error: "school.error.limit" };
  const slug = await pickFreeSlug(profile.name);
  if (!slug) return { errors: { name: "school.error.slug" } };

  const created = await repo.createSchool({ ...profile, slug, needsManualReview: !looksLikeSchoolEmail(session.email) });
  // Demo mode approves new schools right away so the whole flow can be tried.
  if (appEnv().demoMode) await (await repos()).platform().setSchoolStatus(created.id, "approved", "demo-mode");
  (await cookies()).set(SCHOOL_COOKIE, created.id, { httpOnly: true, sameSite: "lax", path: "/", secure: appEnv().isProduction });
  redirect("/setup/3");
}

// ---------- Step 3: places ----------

export async function saveLocations(_prev: FormState, form: FormData): Promise<FormState> {
  const mode = modeOf(form);
  const { repo, school } = await getWizardContext(3);
  const parsed = LocationNamesSchema.safeParse(form.getAll("location").map(String));
  if (!parsed.success) return { error: (fieldErrors(parsed.error).form ?? "locations.error.none") as FormState["error"] };
  try {
    await repo.saveLocations(school!.id, parsed.data, []);
  } catch (e) {
    if (e instanceof RepoError && e.code === "conflict") return { error: "locations.error.inUse" };
    throw e;
  }
  return done(mode, repo, school!.id, 3);
}

// ---------- Step 4: privacy defaults ----------

export async function saveCategoryDefaults(_prev: FormState, form: FormData): Promise<FormState> {
  const mode = modeOf(form);
  const { repo, school } = await getWizardContext(4);
  const defaults = {} as CategoryDefaults;
  for (const category of CATEGORIES) {
    const v = String(form.get(`cat_${category}`) ?? "");
    if (!(VISIBILITIES as readonly string[]).includes(v)) return { errors: { [category]: "common.error.generic" } };
    if (!isAllowedVisibility(category, v as Visibility)) return { errors: { [category]: "visibility.wallet_rule" } };
    defaults[category] = v as Visibility;
  }
  await repo.saveCategoryDefaults(school!.id, defaults);
  return done(mode, repo, school!.id, 4);
}

// ---------- Step 5: pickup and retention ----------

export async function savePolicies(_prev: FormState, form: FormData): Promise<FormState> {
  const mode = modeOf(form);
  const { repo, school } = await getWizardContext(5);
  const parsed = PoliciesSchema.safeParse({
    pickupLocation: form.get("pickupLocation"),
    pickupHours: form.get("pickupHours"),
    photoRetentionDays: form.get("photoRetentionDays"),
    donateAfterDays: form.get("donateAfterDays"),
  });
  if (!parsed.success) return { errors: asMessageKeys(fieldErrors(parsed.error)) };
  await repo.updatePolicies(school!.id, parsed.data);
  return done(mode, repo, school!.id, 5);
}

// ---------- Step 6: staff ----------

export async function createStaffInvite(_prev: FormState, form: FormData): Promise<FormState> {
  const { repo, school } = await getWizardContext(6);
  const parsed = InviteSchema.safeParse({ email: String(form.get("email") ?? "").trim().toLowerCase(), role: form.get("role") });
  if (!parsed.success) return { errors: asMessageKeys(fieldErrors(parsed.error)) };
  if (!(await allow("inviteSchool", school!.id))) return { error: "invite.error.limit" };

  // There's no email service yet, so the owner sends the link themselves.
  // Only the hash is stored; the link is shown once.
  const token = newLinkToken();
  await repo.createInvite(school!.id, parsed.data.email, parsed.data.role, sha256Hex(token));
  revalidatePath("/setup/6");
  revalidatePath("/admin/settings");
  return { ok: true, data: { email: parsed.data.email, link: `${appEnv().appUrl}/invite/${token}` } };
}

export async function revokeStaffInvite(form: FormData): Promise<void> {
  const { repo, school } = await getWizardContext(6);
  await repo.revokeInvite(school!.id, String(form.get("inviteId")));
  revalidatePath("/setup/6");
  revalidatePath("/admin/settings");
}

export async function finishStaffStep(): Promise<void> {
  const { repo, school } = await getWizardContext(6);
  await repo.setSetupStep(school!.id, 6);
  redirect("/setup/7");
}

// ---------- Step 7: launch ----------

export async function rotateJoinCode(): Promise<FormState> {
  const { repo, school } = await getWizardContext(7);
  const code = await repo.rotateJoinCode(school!.id);
  revalidatePath("/setup/7");
  revalidatePath("/admin/settings");
  return { ok: true, data: { code } };
}

export async function launchSchool(): Promise<void> {
  const { repo, school } = await getWizardContext(7);
  await repo.markLaunched(school!.id);
  redirect("/admin");
}
