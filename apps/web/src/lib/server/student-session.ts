/**
 * The student "joined school X" session: a signed cookie, no account.
 *
 * It holds the school id and slug. The signature (HMAC with SESSION_SECRET)
 * means nobody can edit it to point at another school. Student pages read the
 * school id from here and only here, never from the URL or a form, so typing
 * another school's address only works if you've joined that school too.
 */
import "server-only";
import { cookies } from "next/headers";
import { signToken, verifyToken } from "@/lib/auth/signed-token";
import { appEnv } from "@/lib/env";

export const STUDENT_COOKIE = "lb_student";
const DAYS = 30;

export interface StudentSession {
  schoolId: string;
  slug: string;
}

export async function setStudentSession(s: StudentSession): Promise<void> {
  const env = appEnv();
  const value = await signToken({ sid: s.schoolId, slug: s.slug }, DAYS * 86400, env.sessionSecret);
  (await cookies()).set(STUDENT_COOKIE, value, {
    httpOnly: true,
    sameSite: "lax",
    secure: env.isProduction,
    path: "/",
    maxAge: DAYS * 86400,
  });
}

export async function getStudentSession(): Promise<StudentSession | null> {
  const value = (await cookies()).get(STUDENT_COOKIE)?.value;
  if (!value) return null;
  const data = await verifyToken<{ sid: string; slug: string }>(value, appEnv().sessionSecret);
  return data && typeof data.sid === "string" && typeof data.slug === "string" ? { schoolId: data.sid, slug: data.slug } : null;
}
