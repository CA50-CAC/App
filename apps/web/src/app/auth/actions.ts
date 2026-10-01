"use server";

import { redirect } from "next/navigation";
import { authProvider } from "@/lib/server/auth";

export async function signOut() {
  await authProvider().signOut();
  redirect("/login");
}
