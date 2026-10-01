import Link from "next/link";
import { Alert } from "@/components/ui/alert";
import { ButtonLink } from "@/components/ui/button";
import { Logo } from "@/components/logo";
import { DEMO_JOIN_CODE } from "@/lib/demo/constants";
import { appEnv } from "@/lib/env";
import { t } from "@/lib/i18n";
import { JoinForm } from "./join-form";

/**
 * The front door. Students enter a join code; staff sign in or set up a school.
 * A join link (/?code=XXXX, used in QR codes) fills the code in.
 */
export default async function Home({ searchParams }: PageProps<"/">) {
  const params = await searchParams;
  const code = typeof params.code === "string" ? params.code.slice(0, 16) : "";
  const demo = appEnv().demoMode;

  return (
    <main id="main" className="mx-auto flex w-full max-w-xl flex-1 flex-col gap-10 px-4 py-10 sm:py-16">
      <Logo />
      <section aria-labelledby="join-title" className="flex flex-col gap-6">
        <div className="flex flex-col gap-3">
          <h1 id="join-title" className="text-4xl font-semibold tracking-tight sm:text-5xl">
            {t("home.title")}
          </h1>
          <p className="text-lg text-muted">{t("home.lead")}</p>
        </div>
        {params.join ? <Alert tone="info">{t("home.joinFirst")}</Alert> : null}
        <JoinForm initialCode={code} />
        {demo ? <p className="text-sm text-muted">{t("home.demoHint", { code: DEMO_JOIN_CODE })}</p> : null}
      </section>

      <section aria-labelledby="staff-title" className="flex flex-col gap-3 border-t border-border pt-8">
        <h2 id="staff-title" className="text-lg font-semibold">
          {t("home.staffTitle")}
        </h2>
        <div className="flex flex-wrap gap-3">
          <ButtonLink href="/login" variant="secondary">
            {t("home.staffSignIn")}
          </ButtonLink>
          <Link href="/setup" className="inline-flex min-h-11 items-center rounded-xl px-2 font-medium text-accent underline underline-offset-4">
            {t("home.setup")}
          </Link>
        </div>
      </section>
    </main>
  );
}
