"use server";

import { redirect } from "next/navigation";
import { normalizeCode } from "@/lib/domain/codes";
import { t } from "@/lib/i18n";
import { allow, clientIp } from "@/lib/server/rate-limit";
import { repos } from "@/lib/server/repos";
import { setStudentSession } from "@/lib/server/student-session";

export type JoinState = { error?: string; code?: string };

/**
 * A student enters a join code. Only approved schools can be joined; a pending
 * school's code says "not found", the same as a wrong code, so codes can't be
 * probed for which schools exist.
 */
export async function joinSchool(_prev: JoinState, form: FormData): Promise<JoinState> {
  const raw = String(form.get("code") ?? "");
  const code = normalizeCode(raw);
  if (!code) return { error: t("join.error.empty"), code: raw };
  if (!(await allow("joinIp", await clientIp()))) return { error: t("common.error.rateLimited"), code: raw };
  if (!/^[A-Z0-9]{6,12}$/.test(code)) return { error: t("join.error.notFound"), code: raw };

  const school = await (await repos()).system().findJoinableSchool(code);
  if (!school) return { error: t("join.error.notFound"), code: raw };

  await setStudentSession({ schoolId: school.id, slug: school.slug });
  redirect(`/s/${school.slug}`);
}
