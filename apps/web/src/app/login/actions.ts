"use server";

import { z } from "zod";
import { normalizeEmail, safeNextPath } from "@/lib/auth/provider";
import { t } from "@/lib/i18n";
import { authProvider } from "@/lib/server/auth";
import { allow, clientIp } from "@/lib/server/rate-limit";

export type LoginState =
  | { status: "idle" }
  | { status: "error"; message: string; email: string }
  | { status: "sent"; email: string; devLink?: string };

const Email = z.email().max(254);

export async function sendSignInLink(_prev: LoginState, form: FormData): Promise<LoginState> {
  const raw = String(form.get("email") ?? "");
  const parsed = Email.safeParse(raw.trim());
  if (!parsed.success) return { status: "error", message: t("login.error.email"), email: raw };
  const email = normalizeEmail(parsed.data);

  // Bots fill in every field, including the hidden one. Pretend it worked.
  if (form.get("website")) return { status: "sent", email };

  if (!(await allow("magicLinkIp", await clientIp())) || !(await allow("magicLinkEmail", email))) {
    return { status: "error", message: t("common.error.rateLimited"), email };
  }

  try {
    const { devLink } = await authProvider().sendMagicLink(email, safeNextPath(String(form.get("next") ?? "")));
    return { status: "sent", email, devLink };
  } catch (e) {
    console.error("sendMagicLink failed", e instanceof Error ? e.message : e);
    return { status: "error", message: t("common.error.generic"), email };
  }
}
