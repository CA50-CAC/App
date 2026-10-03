/**
 * The student gallery: a grid of found items with a search box and filters.
 * Works without JavaScript (it's a plain GET form). Every item shown comes
 * from the student data layer, which only has what students may see.
 */
import { ItemCard } from "@/components/item-card";
import { CategoryIcon } from "@/components/item-visuals";
import { EmptyState } from "@/components/ui/alert";
import { Button, buttonClass } from "@/components/ui/button";
import { inputClass } from "@/components/ui/field";
import { CATEGORIES, type Category } from "@/lib/domain/types";
import { t } from "@/lib/i18n";
import { searchItems } from "@/lib/services/search";
import { getStudentContext } from "@/lib/server/student-context";

const DATE = /^\d{4}-\d{2}-\d{2}$/;
const str = (v: unknown) => (typeof v === "string" ? v : "");

export default async function GalleryPage({ params, searchParams }: PageProps<"/s/[slug]">) {
  const { slug } = await params;
  const sp = await searchParams;
  const { students, school } = await getStudentContext(slug);

  const q = str(sp.q).slice(0, 100);
  // A category chip submits `pick`; the form carries the current one as `category`.
  const rawCategory = "pick" in sp ? str(sp.pick) : str(sp.category);
  const category = (CATEGORIES as readonly string[]).includes(rawCategory) ? (rawCategory as Category) : "";
  const location = str(sp.location).slice(0, 60);
  const from = DATE.test(str(sp.from)) ? str(sp.from) : "";
  const to = DATE.test(str(sp.to)) ? str(sp.to) : "";
  const filtering = Boolean(q || category || location || from || to);
  const moreFilters = Boolean(location || from || to);
  const chip = (active: boolean) =>
    `inline-flex min-h-11 shrink-0 items-center gap-2 rounded-full border px-4 text-sm font-semibold whitespace-nowrap transition-colors ${
      active ? "border-accent bg-accent text-accent-foreground" : "border-border bg-card text-foreground hover:border-accent/50 hover:bg-accent-soft"
    }`;

  const [{ ids, items }, locations] = await Promise.all([
    searchItems(students, q, {
      categories: category ? [category] : undefined,
      locationNames: location ? [location] : undefined,
      foundAfter: from || undefined,
      foundBefore: to || undefined,
    }),
    students.listLocationNames(),
  ]);
  const pickup = school.pickupLocation ?? "the front office";
  const now = new Date();

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1.5">
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">{t("gallery.title", { school: school.name })}</h1>
        <p className="text-muted sm:text-lg">{t("gallery.lead")}</p>
      </div>

      <form method="get" role="search" className="flex flex-col gap-3">
        <label htmlFor="q" className="sr-only">
          {t("gallery.search")}
        </label>
        <input type="hidden" name="category" value={category} />
        <div className="card flex gap-2 rounded-2xl p-2">
          <div className="relative flex-1">
            <svg aria-hidden viewBox="0 0 24 24" className="pointer-events-none absolute top-1/2 left-3 size-5 -translate-y-1/2 text-muted" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <circle cx="11" cy="11" r="7" />
              <path d="m20 20-3.5-3.5" />
            </svg>
            <input
              id="q"
              name="q"
              type="search"
              defaultValue={q}
              placeholder={t("gallery.search.placeholder")}
              className={`${inputClass} min-h-12 border-transparent pl-10 text-lg shadow-none hover:border-transparent`}
              maxLength={100}
            />
          </div>
          <Button type="submit" className="min-h-12 px-5">
            {t("gallery.search")}
          </Button>
        </div>
        <div role="group" aria-label={t("gallery.category")} className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none]">
          <button type="submit" name="pick" value="" aria-pressed={!category} className={chip(!category)}>
            {t("gallery.all")}
          </button>
          {CATEGORIES.map((c) => (
            <button key={c} type="submit" name="pick" value={c} aria-pressed={category === c} className={chip(category === c)}>
              <CategoryIcon category={c} className="size-4" />
              {t(`category.${c}`)}
            </button>
          ))}
        </div>
        <details className="group card rounded-2xl" open={moreFilters}>
          <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-2 px-4 font-semibold [&::-webkit-details-marker]:hidden">
            <span className="flex items-center gap-2">
              <svg aria-hidden viewBox="0 0 24 24" className="size-5 text-muted" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M4 6h16M7 12h10M10 18h4" />
              </svg>
              {t("gallery.filters")}
            </span>
            <svg aria-hidden viewBox="0 0 24 24" className="size-5 text-muted transition-transform group-open:rotate-180" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="m6 9 6 6 6-6" />
            </svg>
          </summary>
          <div className="grid gap-3 p-4 pt-0 sm:grid-cols-3">
            <label className="flex flex-col gap-1 text-sm font-medium">
              {t("gallery.location")}
              <select name="location" defaultValue={location} className={inputClass}>
                <option value="">{t("gallery.any")}</option>
                {locations.map((l) => (
                  <option key={l} value={l}>
                    {l}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-sm font-medium">
              {t("gallery.from")}
              <input type="date" name="from" defaultValue={from} className={inputClass} />
            </label>
            <label className="flex flex-col gap-1 text-sm font-medium">
              {t("gallery.to")}
              <input type="date" name="to" defaultValue={to} className={inputClass} />
            </label>
            <div className="flex gap-2 sm:col-span-3">
              <Button type="submit" variant="secondary">
                {t("gallery.apply")}
              </Button>
              {filtering ? (
                <a href={`/s/${slug}`} className={buttonClass("ghost")}>
                  {t("gallery.clear")}
                </a>
              ) : null}
            </div>
          </div>
        </details>
      </form>

      <p className="text-sm text-muted" aria-live="polite">
        {ids.length === 1 ? t("gallery.count.one") : t("gallery.count", { count: ids.length })}
      </p>

      {ids.length === 0 ? (
        <EmptyState title={t("gallery.empty.title")}>
          {filtering ? t("gallery.empty.body", { pickup }) : t("gallery.empty.none", { pickup })}
        </EmptyState>
      ) : (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
          {ids.map((id) => (
            <li key={id}>
              <ItemCard item={items.get(id)!} href={`/s/${slug}/items/${id}`} now={now} timeZone="UTC" />
            </li>
          ))}
        </ul>
      )}
      <p className="flex items-start gap-2 rounded-2xl bg-surface px-4 py-3 text-sm text-muted">
        <span aria-hidden>🔒</span>
        {t("gallery.notListed", { pickup })}
      </p>
    </div>
  );
}
