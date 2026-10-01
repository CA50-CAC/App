/**
 * Everything a staff page needs: who is signed in, their data access (with
 * RLS acting as them), and which school they're working in.
 *
 * Staff can belong to more than one school. The chosen one is remembered in
 * the `lb_school` cookie, but that cookie is only a preference: it's checked
 * against the schools the database says they belong to, so editing it can't
 * open another school.
 */
import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import type { StaffSession } from "@/lib/auth/provider";
import type { MemberRole } from "@/lib/domain/types";
import type { School, StaffRepo } from "@/lib/repo/interface";
import { requireStaff } from "./auth";
import { repos } from "./repos";

export const SCHOOL_COOKIE = "lb_school";

export interface StaffContext {
  session: StaffSession;
  repo: StaffRepo;
  school: School & { role: MemberRole };
  schools: Array<School & { role: MemberRole }>;
  isOwner: boolean;
}

/** Signed-in staff only. Sends people with no school yet to the setup wizard. */
export const getStaffContext = cache(async (nextPath: string = "/admin"): Promise<StaffContext> => {
  const { session, repo } = await getStaffRepo(nextPath);
  const schools = await repo.mySchools();
  if (schools.length === 0) redirect("/setup");
  const preferred = (await cookies()).get(SCHOOL_COOKIE)?.value;
  const school = schools.find((s) => s.id === preferred) ?? schools[0];
  return { session, repo, school, schools, isOwner: school.role === "owner" };
});

/** Signed-in staff, before they necessarily have a school (the setup wizard). */
export const getStaffRepo = cache(async (nextPath: string = "/admin") => {
  const session = await requireStaff(nextPath);
  const repo = (await repos()).forStaff({ userId: session.userId, accessToken: session.accessToken });
  return { session, repo };
});

/** For owner-only actions. */
export async function requireOwner(nextPath: string): Promise<StaffContext> {
  const ctx = await getStaffContext(nextPath);
  if (!ctx.isOwner) redirect("/admin?error=owner");
  return ctx;
}
