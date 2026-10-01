import type { Metadata } from "next";
import Link from "next/link";
import { Logo } from "@/components/logo";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { signOut } from "@/app/auth/actions";
import { t } from "@/lib/i18n";
import { getStaffContext } from "@/lib/server/staff-context";
import { DEMO_SCHOOL_ID } from "@/lib/demo/seed";
import { appEnv } from "@/lib/env";
import { AdminNav } from "./admin-nav";
import { resetDemoData } from "./demo-actions";

export const metadata: Metadata = { robots: { index: false, follow: false } };

export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  const { session, school, repo } = await getStaffContext();
  const pending = (await repo.listClaims(school.id, ["pending"])).length;
  const env = appEnv();
  const demoSchool = env.demoMode && env.dataAdapter === "pglite" && school.id === DEMO_SCHOOL_ID;

  return (
    <div className="flex flex-1 flex-col">
      <header className="border-b border-border bg-background">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-3 px-4 pt-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <Link href="/admin" className="rounded-lg">
                <Logo withName={false} />
                <span className="sr-only">{t("app.name")}</span>
              </Link>
              <p className="truncate font-semibold">{school.name}</p>
            </div>
            <form action={signOut} className="flex items-center gap-3">
              <span className="hidden text-sm text-muted sm:inline">{t("nav.signedInAs", { email: session.email })}</span>
              <Button type="submit" variant="ghost">
                {t("nav.signOut")}
              </Button>
            </form>
          </div>
          <AdminNav
            label={t("nav.staffNav")}
            links={[
              { href: "/admin", label: t("nav.items") },
              { href: "/admin/items/new", label: t("nav.newItem") },
              { href: "/admin/claims", label: t("nav.claims"), badge: pending },
              { href: "/admin/settings", label: t("nav.settings") },
            ]}
          />
        </div>
      </header>
      <main id="main" className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-4 py-6">
        {demoSchool ? (
          <form action={resetDemoData} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-warning bg-warning-soft px-4 py-2">
            <p className="text-sm text-warning">{t("demo.resetHelp")}</p>
            <Button type="submit" variant="secondary">
              {t("demo.reset")}
            </Button>
          </form>
        ) : null}
        {school.status === "pending_review" ? (
          <Alert tone="warning" title={t("admin.pending.title")}>
            {t("admin.pending.body")}
          </Alert>
        ) : null}
        {children}
      </main>
    </div>
  );
}
