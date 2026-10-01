import { redirect } from "next/navigation";
import { getStaffSession } from "@/lib/server/auth";
import { getWizardContext, resumeStep } from "@/lib/server/wizard";

/** /setup: send the admin to the right step, so closing the browser mid-wizard resumes where they were. */
export default async function SetupIndex() {
  if (!(await getStaffSession())) redirect("/setup/1");
  const { school } = await getWizardContext(2);
  if (school?.launchedAt) redirect("/admin");
  redirect(`/setup/${resumeStep(school)}`);
}
