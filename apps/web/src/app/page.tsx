import { t } from "@/lib/i18n";

// Placeholder landing page. The real entry points are /setup (school admins)
// and /s/[slug] (students); both are built in later steps.
export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col justify-center gap-4 px-6 py-16">
      <h1 className="text-4xl font-semibold tracking-tight">{t("app.name")}</h1>
      <p className="text-lg text-muted">{t("app.tagline")}</p>
      <p className="rounded-2xl border border-border bg-surface p-4 text-muted">{t("home.placeholder")}</p>
    </main>
  );
}
