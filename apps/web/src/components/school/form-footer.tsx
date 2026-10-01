"use client";

import { Alert } from "@/components/ui/alert";
import { SubmitButton } from "@/components/ui/submit-button";
import { t } from "@/lib/i18n";
import type { FormState } from "@/lib/server/forms";

/** The bottom of every setup/settings form: a form-level error, "Saved", and the submit button. */
export function FormFooter({ state, mode, backHref }: { state: FormState; mode: "wizard" | "settings"; backHref?: string }) {
  return (
    <div className="flex flex-col gap-3">
      {state.error ? <Alert tone="danger">{t(state.error)}</Alert> : null}
      {state.ok && mode === "settings" ? <Alert tone="success">{t("setup.saved")}</Alert> : null}
      <div className="flex flex-wrap items-center gap-3">
        <SubmitButton pendingLabel={t("common.saving")}>{mode === "wizard" ? t("setup.saveContinue") : t("common.save")}</SubmitButton>
        {backHref ? (
          <a href={backHref} className="inline-flex min-h-11 items-center rounded-xl px-3 font-medium text-muted hover:text-foreground">
            {t("common.back")}
          </a>
        ) : null}
      </div>
    </div>
  );
}
