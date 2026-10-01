"use client";

import { useActionState, useState } from "react";
import { createStaffInvite } from "@/app/setup/actions";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Select, TextInput } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";
import { t } from "@/lib/i18n";
import { EMPTY_FORM, type FormState } from "@/lib/server/forms";

export function InviteForm() {
  const [state, action] = useActionState<FormState, FormData>(createStaffInvite, EMPTY_FORM);
  const err = (k: string) => (state.errors?.[k] ? t(state.errors[k]) : undefined);
  return (
    <div className="flex flex-col gap-4">
      <form action={action} className="grid gap-4 sm:grid-cols-[1fr_10rem_auto] sm:items-start" noValidate>
        <TextInput id="invite-email" name="email" type="email" label={t("staff.email")} autoComplete="off" required error={err("email")} />
        <Select id="invite-role" name="role" label={t("staff.role")} defaultValue="staff">
          <option value="staff">{t("staff.role.staff")}</option>
          <option value="owner">{t("staff.role.owner")}</option>
        </Select>
        <SubmitButton pendingLabel={t("staff.inviting")} variant="secondary" className="sm:mt-8">
          {t("staff.invite")}
        </SubmitButton>
      </form>
      <p className="-mt-2 text-sm text-muted">{t("staff.role.help")}</p>
      {state.error ? <Alert tone="danger">{t(state.error)}</Alert> : null}
      {state.ok && state.data?.link ? <InviteLink email={state.data.email} link={state.data.link} /> : null}
    </div>
  );
}

function InviteLink({ email, link }: { email: string; link: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <Alert tone="success" title={t("staff.inviteLink.title", { email })}>
      <p className="text-sm">{t("staff.inviteLink.body")}</p>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <code className="max-w-full overflow-x-auto rounded-lg bg-background px-2 py-1 text-sm break-all">{link}</code>
        <Button
          type="button"
          variant="secondary"
          onClick={async () => {
            await navigator.clipboard.writeText(link);
            setCopied(true);
          }}
        >
          {copied ? t("staff.copied") : t("staff.copy")}
        </Button>
      </div>
    </Alert>
  );
}
