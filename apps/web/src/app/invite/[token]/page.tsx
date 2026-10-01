import type { Metadata } from "next";
import { AuthShell } from "@/components/auth-shell";
import { Alert } from "@/components/ui/alert";
import { SubmitButton } from "@/components/ui/submit-button";
import { t } from "@/lib/i18n";
import { requireStaff } from "@/lib/server/auth";
import { acceptInvite } from "./actions";

export const metadata: Metadata = { title: t("invite.accept.title"), robots: { index: false } };

/**
 * A staff invite link. The person signs in first (with the email the invite
 * was sent to), then accepts. The database checks the email matches.
 */
export default async function InvitePage({ params, searchParams }: PageProps<"/invite/[token]">) {
  const { token } = await params;
  const session = await requireStaff(`/invite/${token}`);
  const failed = (await searchParams).error === "1";
  return (
    <AuthShell title={t("invite.accept.title")} lead={t("invite.accept.lead")}>
      {failed ? <Alert tone="danger">{t("invite.accept.error", { email: session.email })}</Alert> : null}
      <p className="text-muted">{t("nav.signedInAs", { email: session.email })}</p>
      <form action={acceptInvite}>
        <input type="hidden" name="token" value={token} />
        <SubmitButton pendingLabel={t("invite.accept.pending")}>{t("invite.accept.submit")}</SubmitButton>
      </form>
    </AuthShell>
  );
}
