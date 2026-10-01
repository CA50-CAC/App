"use client";

import { useActionState, useState } from "react";
import { rotateJoinCode } from "@/app/setup/actions";
import { Button } from "@/components/ui/button";
import { SubmitButton } from "@/components/ui/submit-button";
import { t } from "@/lib/i18n";
import { EMPTY_FORM, type FormState } from "@/lib/server/forms";

/** The school's join code and link, with a button for owners to replace the code. */
export function JoinCodePanel({ code, appUrl, isOwner }: { code: string; appUrl: string; isOwner: boolean }) {
  const [state, action] = useActionState<FormState, FormData>(rotateJoinCode, EMPTY_FORM);
  const current = state.data?.code ?? code;
  const link = `${appUrl}/?code=${current}`;
  const [copied, setCopied] = useState(false);
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <p className="text-sm font-medium text-muted">{t("launch.joinCode")}</p>
        <p aria-live="polite" className="font-mono text-4xl font-semibold tracking-[0.25em] text-accent sm:text-5xl">
          {current}
        </p>
      </div>
      <div className="flex flex-col gap-1">
        <p className="text-sm font-medium text-muted">{t("launch.link")}</p>
        <div className="flex flex-wrap items-center gap-2">
          <code className="rounded-lg bg-surface px-2 py-1 text-sm break-all">{link}</code>
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
      </div>
      {isOwner ? (
        <form action={action} className="flex flex-col gap-2">
          <p className="text-sm text-muted">{t("launch.rotate.help")}</p>
          <SubmitButton variant="secondary" pendingLabel={t("launch.rotating")} className="self-start">
            {t("launch.rotate")}
          </SubmitButton>
        </form>
      ) : null}
    </div>
  );
}
