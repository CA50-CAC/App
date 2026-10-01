/**
 * What happens to the item when staff decide on a claim. Staff verify in
 * person; the app only records the outcome.
 *
 * - approve: claim approved, item marked "claimed" (off the student gallery,
 *   waiting for pickup)
 * - reject: claim rejected; if the item was held for this claim and no other
 *   claim is approved, it goes back on the shelf ("available")
 * - picked up: claim picked up, item "returned"
 *
 * Every step goes through the staff data layer, so RLS applies.
 */
import { RepoError, type StaffRepo } from "@/lib/repo/interface";

export type ClaimDecision = "approve" | "reject" | "picked_up";

export async function decideClaim(repo: StaffRepo, schoolId: string, claimId: string, decision: ClaimDecision): Promise<void> {
  const claim = await repo.getClaim(schoolId, claimId);
  if (!claim) throw new RepoError("not_found", "Claim not found");
  const item = await repo.getItem(schoolId, claim.itemId);
  if (!item) throw new RepoError("not_found", "Item not found");

  if (decision === "approve") {
    if (claim.status !== "pending") throw new RepoError("conflict", "Only a pending claim can be approved");
    await repo.setClaimStatus(schoolId, claimId, "approved");
    if (item.status === "available") await repo.setItemStatus(schoolId, [item.id], "claimed", "claim approved");
    return;
  }

  if (decision === "reject") {
    if (claim.status !== "pending" && claim.status !== "approved") throw new RepoError("conflict", "This claim is already closed");
    await repo.setClaimStatus(schoolId, claimId, "rejected");
    const others = (await repo.listClaims(schoolId, ["approved"])).filter((c) => c.itemId === item.id && c.id !== claimId);
    if (item.status === "claimed" && others.length === 0) await repo.setItemStatus(schoolId, [item.id], "available", "claim rejected");
    return;
  }

  if (claim.status !== "approved") throw new RepoError("conflict", "Approve the claim before marking it picked up");
  await repo.setClaimStatus(schoolId, claimId, "picked_up");
  await repo.setItemStatus(schoolId, [item.id], "returned", "picked up by owner");
}
