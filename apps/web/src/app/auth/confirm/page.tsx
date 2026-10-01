import type { Metadata } from "next";
import { AuthShell } from "@/components/auth-shell";
import { SubmitButton } from "@/components/ui/submit-button";
import { t } from "@/lib/i18n";
import { confirmSignIn } from "./actions";

export const metadata: Metadata = { title: t("confirm.title"), robots: { index: false } };

export default async function ConfirmPage({ searchParams }: PageProps<"/auth/confirm">) {
  const params = await searchParams;
  const pass = ["token", "token_hash", "type", "code", "next"].flatMap((k) =>
    typeof params[k] === "string" ? [[k, params[k] as string] as const] : [],
  );
  return (
    <AuthShell title={t("confirm.title")} lead={t("confirm.lead")}>
      <form action={confirmSignIn} className="flex flex-col">
        {pass.map(([k, v]) => (
          <input key={k} type="hidden" name={k} value={v} />
        ))}
        <SubmitButton pendingLabel={t("confirm.pending")}>{t("confirm.submit")}</SubmitButton>
      </form>
    </AuthShell>
  );
}
