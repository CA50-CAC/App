import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Alert } from "@/components/ui/alert";
import { safeNextPath } from "@/lib/auth/provider";
import { DEMO_STAFF_EMAIL } from "@/lib/demo/constants";
import { appEnv } from "@/lib/env";
import { t } from "@/lib/i18n";
import { getStaffSession } from "@/lib/server/auth";
import { AuthShell } from "@/components/auth-shell";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: t("login.title"), robots: { index: false } };

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const params = await searchParams;
  const next = safeNextPath(typeof params.next === "string" ? params.next : null);
  if (await getStaffSession()) redirect(next);

  return (
    <AuthShell title={t("login.title")} lead={t("login.lead")}>
      {params.error === "link" ? <Alert tone="danger">{t("login.error.link")}</Alert> : null}
      <LoginForm next={next} demoEmail={appEnv().demoMode ? DEMO_STAFF_EMAIL : null} />
    </AuthShell>
  );
}
