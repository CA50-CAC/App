import Link from "next/link";
import { Alert } from "@/components/ui/alert";
import { buttonClass } from "@/components/ui/button";
import { Logo } from "@/components/logo";
import { DEMO_JOIN_CODE } from "@/lib/demo/constants";
import { appEnv } from "@/lib/env";
import { t, type MessageKey } from "@/lib/i18n";
import { JoinForm } from "./join-form";

const STEPS = [1, 2, 3] as const;

/**
 * The front door. Students enter a join code; staff sign in or set up a school.
 * A join link (/?code=XXXX, used in QR codes) fills the code in.
 */
export default async function Home({ searchParams }: PageProps<"/">) {
  const params = await searchParams;
  const code = typeof params.code === "string" ? params.code.slice(0, 16) : "";
  const demo = appEnv().demoMode;

  return (
    <div className="hero-glow flex flex-1 flex-col">
      <main id="main" className="mx-auto flex w-full max-w-xl flex-1 flex-col gap-10 px-4 py-10 sm:py-16">
        <Logo />
        <section aria-labelledby="join-title" className="flex flex-col gap-6">
          <div className="flex flex-col gap-3">
            <p className="self-start rounded-full bg-accent-soft px-3 py-1 text-sm font-semibold text-accent">{t("home.eyebrow")}</p>
            <h1 id="join-title" className="text-4xl font-semibold tracking-tight sm:text-5xl">
              {t("home.title")}
            </h1>
            <p className="text-lg text-muted">{t("home.lead")}</p>
          </div>
          {params.join ? <Alert tone="info">{t("home.joinFirst")}</Alert> : null}
          <div className="card flex flex-col gap-4 p-5 sm:p-6">
            <JoinForm initialCode={code} />
            {demo ? (
              <p className="rounded-xl bg-surface px-3 py-2 text-sm text-muted">
                {t("home.demoHint", { code: DEMO_JOIN_CODE })}
              </p>
            ) : null}
          </div>
        </section>

        <section aria-labelledby="how-title" className="flex flex-col gap-4">
          <h2 id="how-title" className="text-sm font-semibold tracking-wide text-muted uppercase">
            {t("home.how")}
          </h2>
          <ol className="grid gap-3 sm:grid-cols-3">
            {STEPS.map((n) => (
              <li key={n} className="flex gap-3 sm:flex-col sm:gap-2">
                <span aria-hidden className="grid size-8 shrink-0 place-items-center rounded-full bg-accent text-sm font-bold text-accent-foreground">
                  {n}
                </span>
                <div>
                  <p className="font-semibold">{t(`home.how.${n}.title` as MessageKey)}</p>
                  <p className="text-sm text-muted">{t(`home.how.${n}.body` as MessageKey)}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        <section aria-labelledby="staff-title" className="card flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
          <div className="flex flex-col gap-1">
            <h2 id="staff-title" className="text-lg font-semibold">
              {t("home.staffTitle")}
            </h2>
            <p className="text-sm text-muted">{t("home.staffLead")}</p>
          </div>
          <div className="flex shrink-0 flex-col gap-2 sm:items-end">
            <Link href="/login" className={buttonClass("secondary")}>
              {t("home.staffSignIn")}
            </Link>
            <Link href="/setup" className="inline-flex min-h-11 items-center justify-center rounded-xl px-2 text-sm font-semibold text-accent underline-offset-4 hover:underline">
              {t("home.setup")} →
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}
