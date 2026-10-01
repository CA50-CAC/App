/**
 * The setup wizard's view of the world: the signed-in staff member and the
 * school they're setting up (null before step 2 creates it).
 *
 * Progress lives in the database (schools.setup_step = highest step finished),
 * so closing the browser and coming back resumes at the right step.
 */
import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { MemberRole } from "@/lib/domain/types";
import type { School } from "@/lib/repo/interface";
import { getStaffRepo, SCHOOL_COOKIE } from "./staff-context";

export const WIZARD_STEPS = 7;

export async function getWizardContext(step: number) {
  const { session, repo } = await getStaffRepo(`/setup/${step}`);
  const schools = await repo.mySchools();
  const preferred = (await cookies()).get(SCHOOL_COOKIE)?.value;
  const school: (School & { role: MemberRole }) | null = schools.find((s) => s.id === preferred) ?? schools[0] ?? null;
  // Only owners configure a school. Staff who joined by invite go to the dashboard.
  if (school && school.role !== "owner") redirect("/admin");
  // Every step after "school" needs the school to exist.
  if (!school && step > 2) redirect("/setup/2");
  return { session, repo, school };
}

/** The step to resume at: the first one not finished yet. */
export function resumeStep(school: Pick<School, "setupStep"> | null): number {
  if (!school) return 2;
  return Math.min(school.setupStep + 1, WIZARD_STEPS);
}
