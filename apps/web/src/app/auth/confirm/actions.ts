"use server";

import { redirect } from "next/navigation";
import { authProvider, takeNextPath } from "@/lib/server/auth";

/**
 * Redeems a sign-in link. It runs on a button press (POST), not when the link
 * is opened, because some email systems open every link to scan it, which
 * would use up a one-time link before the person ever clicks it.
 */
export async function confirmSignIn(form: FormData) {
  const params = new URLSearchParams();
  for (const key of ["token", "token_hash", "type", "code", "next"]) {
    const v = form.get(key);
    if (typeof v === "string" && v) params.set(key, v);
  }
  const next = await takeNextPath(params);
  const session = await authProvider().verifyMagicLink(params);
  if (!session) redirect(`/login?error=link&next=${encodeURIComponent(next)}`);
  redirect(next);
}
