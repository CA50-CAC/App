import type { ReactNode } from "react";

type Tone = "info" | "success" | "warning" | "danger";

const TONES: Record<Tone, string> = {
  info: "border-border bg-surface text-foreground",
  success: "border-success bg-success-soft text-success",
  warning: "border-warning bg-warning-soft text-warning",
  danger: "border-danger bg-danger-soft text-danger",
};

/** A message box. `role="alert"` for errors so screen readers announce them right away. */
export function Alert({ tone = "info", title, children }: { tone?: Tone; title?: string; children?: ReactNode }) {
  return (
    <div role={tone === "danger" ? "alert" : "status"} className={`rounded-xl border px-4 py-3 ${TONES[tone]}`}>
      {title ? <p className="font-semibold">{title}</p> : null}
      {children ? <div className={title ? "mt-1 text-foreground" : ""}>{children}</div> : null}
    </div>
  );
}

export function EmptyState({ title, children, action }: { title: string; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border px-6 py-12 text-center">
      <svg aria-hidden viewBox="0 0 48 48" className="size-12 text-muted" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="8" y="16" width="32" height="24" rx="4" />
        <path d="M8 22h32M20 16v-4a4 4 0 0 1 8 0v4" />
      </svg>
      <p className="text-lg font-semibold">{title}</p>
      {children ? <div className="max-w-md text-muted">{children}</div> : null}
      {action}
    </div>
  );
}
