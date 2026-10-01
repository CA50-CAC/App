import type { Metadata } from "next";
import Link from "next/link";
import { Logo } from "@/components/logo";
import { t } from "@/lib/i18n";
import { getStudentContext } from "@/lib/server/student-context";

// School pages must never show up in search results (also set as an X-Robots-Tag header).
export const metadata: Metadata = { robots: { index: false, follow: false } };

export default async function StudentLayout({ children, params }: LayoutProps<"/s/[slug]">) {
  const { slug } = await params;
  const { school } = await getStudentContext(slug);
  return (
    <div className="flex flex-1 flex-col">
      <header className="border-b border-border">
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between gap-3 px-4 py-3">
          <Link href={`/s/${slug}`} className="flex min-w-0 items-center gap-2 rounded-lg">
            <Logo withName={false} />
            <span className="truncate font-semibold">{school.name}</span>
          </Link>
          <Link href={`/s/${slug}/status`} className="inline-flex min-h-11 shrink-0 items-center rounded-xl px-3 text-sm font-medium text-accent hover:bg-accent-soft">
            {t("gallery.checkClaim")}
          </Link>
        </div>
      </header>
      <main id="main" className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-4 py-6">
        {children}
      </main>
      <footer className="border-t border-border">
        <div className="mx-auto flex w-full max-w-5xl flex-wrap items-center justify-between gap-2 px-4 py-4 text-sm text-muted">
          <p>
            {school.pickupLocation ? t("gallery.pickup", { location: school.pickupLocation, hours: school.pickupHours ?? "" }) : null}
          </p>
          <Link href="/" className="inline-flex min-h-11 items-center underline underline-offset-4">
            {t("gallery.switch")}
          </Link>
        </div>
      </footer>
    </div>
  );
}
