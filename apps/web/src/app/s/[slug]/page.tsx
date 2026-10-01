/**
 * The student gallery: a grid of found items with a search box and filters.
 * Works without JavaScript (it's a plain GET form). Every item shown comes
 * from the student data layer, which only has what students may see.
 */
import { ItemCard } from "@/components/item-card";
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
  const category = (CATEGORIES as readonly string[]).includes(str(sp.category)) ? (str(sp.category) as Category) : "";
  const location = str(sp.location).slice(0, 60);
  const from = DATE.test(str(sp.from)) ? str(sp.from) : "";
  const to = DATE.test(str(sp.to)) ? str(sp.to) : "";
  const filtering = Boolean(q || category || location || from || to);

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
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-semibold tracking-tight">{t("gallery.title", { school: school.name })}</h1>
        <p className="text-muted">{t("gallery.lead")}</p>
      </div>

      <form method="get" role="search" className="flex flex-col gap-3">
        <label htmlFor="q" className="sr-only">
          {t("gallery.search")}
        </label>
        <div className="flex gap-2">
          <input id="q" name="q" type="search" defaultValue={q} placeholder={t("gallery.search.placeholder")} className={`${inputClass} min-h-12 text-lg`} maxLength={100} />
          <Button type="submit" className="min-h-12">
            {t("gallery.search")}
          </Button>
        </div>
        <details className="group rounded-xl border border-border" open={Boolean(category || location || from || to)}>
          <summary className="flex min-h-11 cursor-pointer items-center px-4 font-medium">{t("gallery.filters")}</summary>
          <div className="grid gap-3 p-4 pt-0 sm:grid-cols-2 lg:grid-cols-4">
            <label className="flex flex-col gap-1 text-sm font-medium">
              {t("gallery.category")}
              <select name="category" defaultValue={category} className={inputClass}>
                <option value="">{t("gallery.any")}</option>
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {t(`category.${c}`)}
                  </option>
                ))}
              </select>
            </label>
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
            <div className="flex gap-2 sm:col-span-2 lg:col-span-4">
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
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {ids.map((id) => (
            <li key={id}>
              <ItemCard item={items.get(id)!} href={`/s/${slug}/items/${id}`} now={now} timeZone="UTC" />
            </li>
          ))}
        </ul>
      )}
      <p className="text-sm text-muted">{t("gallery.notListed", { pickup })}</p>
    </div>
  );
}
