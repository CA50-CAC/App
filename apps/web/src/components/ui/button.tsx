/**
 * Buttons and button-styled links. Every size is at least 44px tall so it's
 * easy to hit with a thumb (WCAG 2.5.5 target size).
 */
import Link from "next/link";
import type { ComponentProps } from "react";

export type ButtonVariant = "primary" | "secondary" | "danger" | "ghost";

const VARIANTS: Record<ButtonVariant, string> = {
  primary: "bg-accent text-accent-foreground hover:opacity-90",
  secondary: "border border-border bg-background text-foreground hover:bg-surface",
  danger: "border border-danger bg-background text-danger hover:bg-danger-soft",
  ghost: "text-foreground hover:bg-surface",
};

export function buttonClass(variant: ButtonVariant = "primary", extra = ""): string {
  return [
    "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-4 py-2 text-base font-medium",
    "transition-colors disabled:cursor-not-allowed disabled:opacity-60",
    VARIANTS[variant],
    extra,
  ].join(" ");
}

export function Button({ variant = "primary", className = "", ...props }: ComponentProps<"button"> & { variant?: ButtonVariant }) {
  return <button className={buttonClass(variant, className)} {...props} />;
}

export function ButtonLink({
  variant = "primary",
  className = "",
  ...props
}: ComponentProps<typeof Link> & { variant?: ButtonVariant }) {
  return <Link className={buttonClass(variant, className)} {...props} />;
}
