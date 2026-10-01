"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { RepoError } from "@/lib/repo/interface";
import { decideClaim, type ClaimDecision } from "@/lib/services/claims";
import { getStaffContext } from "@/lib/server/staff-context";

const DECISIONS: ClaimDecision[] = ["approve", "reject", "picked_up"];

export async function decideClaimAction(form: FormData): Promise<void> {
  const { repo, school } = await getStaffContext("/admin/claims");
  const claimId = String(form.get("claimId") ?? "");
  const decision = String(form.get("decision") ?? "") as ClaimDecision;
  const view = String(form.get("view") ?? "pending");
  if (!DECISIONS.includes(decision)) redirect(`/admin/claims?view=${view}&error=1`);
  try {
    await decideClaim(repo, school.id, claimId, decision);
  } catch (e) {
    if (e instanceof RepoError) redirect(`/admin/claims?view=${view}&error=1`);
    throw e;
  }
  revalidatePath("/admin", "layout");
  redirect(`/admin/claims?view=${view}&done=1`);
}
