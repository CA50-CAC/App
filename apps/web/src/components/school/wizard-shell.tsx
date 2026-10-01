import Link from "next/link";
import type { ReactNode } from "react";
import { Logo } from "@/components/logo";
import { t, type MessageKey } from "@/lib/i18n";

const TOTAL = 7;

/**
 * The frame around every wizard step: progress, title, and the step's form.
 * Finished steps are links, so the admin can go back and change anything.
 */
export function WizardShell({
  step,
  maxReachable,
  title,
  lead,
  wide = false,
  children,
}: {
  step: number;
  maxReachable: number;
  title: string;
  lead?: string;
  wide?: boolean;
  children: ReactNode;
}) {
  return (
    <main id="main" className={`mx-auto flex w-full ${wide ? "max-w-6xl" : "max-w-2xl"} flex-1 flex-col gap-8 px-4 py-8`}>
      <div className="flex items-center justify-between gap-4">
        <Link href="/" className="rounded-lg">
          <Logo />
          <span className="sr-only">{t("app.name")}</span>
        </Link>
        <p className="text-sm text-muted">{t("setup.stepOf", { step, total: TOTAL })}</p>
      </div>

      <nav aria-label={t("setup.progress")}>
        <ol className="grid grid-cols-7 gap-1.5">
          {Array.from({ length: TOTAL }, (_, i) => i + 1).map((n) => {
            const label = t(`setup.step.${n}` as MessageKey);
            const done = n < step;
            const current = n === step;
            const reachable = n <= maxReachable && !current;
            const bar = `h-1.5 rounded-full ${current || done ? "bg-accent" : "bg-border"}`;
            const text = `mt-1.5 hidden text-xs sm:block ${current ? "font-semibold text-foreground" : "text-muted"}`;
            return (
              <li key={n}>
                {reachable ? (
                  <Link href={`/setup/${n}`} className="block rounded">
                    <div className={bar} />
                    <span className={text}>{label}</span>
                    <span className="sr-only sm:hidden">{label}</span>
                  </Link>
                ) : (
                  <div aria-current={current ? "step" : undefined}>
                    <div className={bar} />
                    <span className={text}>{label}</span>
                    <span className="sr-only sm:hidden">{label}</span>
                  </div>
                )}
              </li>
            );
          })}
        </ol>
      </nav>

      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-semibold tracking-tight">{title}</h1>
        {lead ? <p className="text-lg text-muted">{lead}</p> : null}
      </div>
      {children}
    </main>
  );
}
