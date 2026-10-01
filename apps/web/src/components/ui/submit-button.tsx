"use client";

/**
 * A submit button that shows it's working while its form's server action runs,
 * and can't be double-clicked into a duplicate submission.
 */
import { useFormStatus } from "react-dom";
import { Button, type ButtonVariant } from "./button";

export function SubmitButton({
  children,
  pendingLabel,
  variant = "primary",
  className = "",
  name,
  value,
}: {
  children: React.ReactNode;
  pendingLabel: string;
  variant?: ButtonVariant;
  className?: string;
  name?: string;
  value?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant={variant} className={className} disabled={pending} aria-disabled={pending} name={name} value={value}>
      {pending ? (
        <>
          <span aria-hidden className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
          {pendingLabel}
        </>
      ) : (
        children
      )}
    </Button>
  );
}
