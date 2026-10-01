/**
 * The shape every form action returns, so form components can show field
 * errors, a general error, or a success message the same way.
 *
 * Messages are i18n keys, turned into text by the form component, so server
 * actions don't build user-facing strings.
 */
import type { MessageKey } from "@/lib/i18n";

export interface FormState {
  ok?: boolean;
  /** field name -> message key */
  errors?: Record<string, MessageKey>;
  /** A message for the whole form. */
  error?: MessageKey;
  /** Anything extra the form needs back (an invite link, a new join code). */
  data?: Record<string, string>;
}

export const EMPTY_FORM: FormState = {};

export function asMessageKeys(errors: Record<string, string>): Record<string, MessageKey> {
  return errors as Record<string, MessageKey>;
}
