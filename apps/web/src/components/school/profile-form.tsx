"use client";

import { useActionState } from "react";
import { saveSchoolProfile } from "@/app/setup/actions";
import { Honeypot, Select, TextInput } from "@/components/ui/field";
import { t } from "@/lib/i18n";
import { EMPTY_FORM, type FormState } from "@/lib/server/forms";
import { FormFooter } from "./form-footer";

export interface ProfileValues {
  name: string;
  district: string | null;
  timeZone: string;
}

export function ProfileForm({
  mode,
  initial,
  timeZones,
  backHref,
}: {
  mode: "wizard" | "settings";
  initial: ProfileValues;
  timeZones: string[];
  backHref?: string;
}) {
  const [state, action] = useActionState<FormState, FormData>(saveSchoolProfile, EMPTY_FORM);
  const err = (k: string) => (state.errors?.[k] ? t(state.errors[k]) : undefined);
  return (
    <form action={action} className="relative flex flex-col gap-5" noValidate>
      <input type="hidden" name="mode" value={mode} />
      <Honeypot />
      <TextInput id="name" name="name" label={t("school.name")} defaultValue={initial.name} required maxLength={120} autoComplete="organization" error={err("name")} />
      <TextInput
        id="district"
        name="district"
        label={t("school.district")}
        optional={t("common.optional")}
        defaultValue={initial.district ?? ""}
        maxLength={120}
        error={err("district")}
      />
      <Select id="timeZone" name="timeZone" label={t("school.timeZone")} help={t("school.timeZone.help")} defaultValue={initial.timeZone} error={err("timeZone")}>
        {timeZones.map((tz) => (
          <option key={tz} value={tz}>
            {tz.replace(/_/g, " ")}
          </option>
        ))}
      </Select>
      <FormFooter state={state} mode={mode} backHref={backHref} />
    </form>
  );
}
