"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { uploadsDir } from "@/lib/db/data-dir";
import { DEMO_SCHOOL_ID, seedDemo } from "@/lib/demo/seed";
import { appEnv } from "@/lib/env";
import { getPglite } from "@/lib/server/pglite-instance";
import { getStaffContext } from "@/lib/server/staff-context";

/** Staff-only, demo-mode-only: put Demo High School back to its seeded state. */
export async function resetDemoData(): Promise<void> {
  const env = appEnv();
  const { school } = await getStaffContext("/admin");
  if (!env.demoMode || env.dataAdapter !== "pglite" || school.id !== DEMO_SCHOOL_ID) redirect("/admin");
  await seedDemo(await getPglite(), uploadsDir());
  revalidatePath("/", "layout");
  redirect("/admin?reset=1");
}
