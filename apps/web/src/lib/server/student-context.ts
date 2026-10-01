/**
 * Everything a student page needs. The school comes from the signed student
 * cookie only. The slug in the URL just has to match it; it never chooses the
 * school. Someone who hasn't joined (or joined a different school) is sent to
 * the front page to enter a code.
 */
import "server-only";
import { redirect } from "next/navigation";
import { cache } from "react";
import { repos } from "./repos";
import { getStudentSession } from "./student-session";

export const getStudentContext = cache(async (slug: string) => {
  const session = await getStudentSession();
  if (!session || session.slug !== slug) redirect("/?join=1");
  const students = (await repos()).forStudent(session.schoolId);
  const school = await students.getSchool();
  // The school was un-approved since they joined.
  if (!school) redirect("/?join=1");
  return { students, school };
});
