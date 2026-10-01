"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { appEnv } from "@/lib/env";
import { getStaffRepo, SCHOOL_COOKIE } from "@/lib/server/staff-context";
import { sha256Hex } from "@/lib/server/tokens";

export async function acceptInvite(form: FormData) {
  const token = String(form.get("token") ?? "");
  const { repo } = await getStaffRepo(`/invite/${token}`);
  const result = token ? await repo.acceptInvite(sha256Hex(token)) : null;
  if (!result) redirect(`/invite/${encodeURIComponent(token)}?error=1`);
  (await cookies()).set(SCHOOL_COOKIE, result.schoolId, { httpOnly: true, sameSite: "lax", path: "/", secure: appEnv().isProduction });
  redirect("/admin");
}
