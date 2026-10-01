/**
 * The staff dashboard: every item at the school, with filters. Open items
 * (available or claimed) are shown first by default.
 */
import Link from "next/link";
import { Alert, EmptyState } from "@/components/ui/alert";
import { Button, ButtonLink } from "@/components/ui/button";
import { StatusBadge, Thumb, VisibilityBadge } from "@/components/staff-item-bits";
import { CATEGORIES, ITEM_STATUSES, type Category, type ItemStatus } from "@/lib/domain/types";
import { foundAgo } from "@/lib/i18n/dates";
import { t } from "@/lib/i18n";
import { photoStore } from "@/lib/server/photos";
import { getStaffContext } from "@/lib/server/staff-context";

const selectClass = "min-h-11 rounded-xl border border-border bg-card px-3 shadow-xs";

export default async function ItemsPage({ searchParams }: PageProps<"/admin">) {
  const params = await searchParams;
  const { repo, school } = await getStaffContext("/admin");
  const status = typeof params.status === "string" ? params.status : "open";
  const category = typeof params.category === "string" && (CATEGORIES as readonly string[]).includes(params.category) ? (params.category as Category) : "";
  const location = typeof params.location === "string" ? params.location : "";

  const statuses: ItemStatus[] | undefined =
    status === "open" ? ["available", "claimed"] : (ITEM_STATUSES as readonly string[]).includes(status) ? [status as ItemStatus] : undefined;

  const [items, locations, claims] = await Promise.all([
    repo.listItems(school.id, {
      statuses,
      categories: category ? [category] : undefined,
      locationIds: location ? [location] : undefined,
    }),
    repo.listLocations(school.id),
    repo.listClaims(school.id, ["pending"]),
  ]);
  const pendingByItem = new Map<string, number>();
  for (const c of claims) pendingByItem.set(c.itemId, (pendingByItem.get(c.itemId) ?? 0) + 1);
  const urls = await Promise.all(items.map((i) => (i.photoPath ? photoStore().url(i.photoPath) : null)));
  const filtered = status !== "open" || category || location;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl font-semibold tracking-tight">{t("items.title")}</h1>
        <ButtonLink href="/admin/items/new">+ {t("items.add")}</ButtonLink>
      </div>
      {params.reset ? <Alert tone="success">{t("demo.resetDone")}</Alert> : null}
      {params.removed ? <Alert tone="success">{t("status.removed")}.</Alert> : null}
      {params.error === "owner" ? <Alert tone="warning">{t("admin.error.owner")}</Alert> : null}

      <form method="get" className="card flex flex-wrap items-end gap-3 p-4" aria-label="Filters">
        <label className="flex flex-col gap-1 text-sm font-medium">
          {t("items.filter.status")}
          <select name="status" defaultValue={status} className={selectClass}>
            <option value="open">{t("items.filter.open")}</option>
            {ITEM_STATUSES.map((s) => (
              <option key={s} value={s}>
                {t(`status.${s}`)}
              </option>
            ))}
            <option value="all">{t("items.filter.all")}</option>
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium">
          {t("items.filter.category")}
          <select name="category" defaultValue={category} className={selectClass}>
            <option value="">{t("items.filter.all")}</option>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {t(`category.${c}`)}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium">
          {t("items.filter.location")}
          <select name="location" defaultValue={location} className={selectClass}>
            <option value="">{t("items.filter.all")}</option>
            {locations.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name}
              </option>
            ))}
          </select>
        </label>
        <Button type="submit" variant="secondary">
          {t("items.filter.apply")}
        </Button>
      </form>

      <p className="text-sm text-muted" aria-live="polite">
        {t("items.count", { count: items.length })}
      </p>

      {items.length === 0 ? (
        <EmptyState
          title={filtered ? t("items.empty.filtered") : t("items.empty.title")}
          action={filtered ? null : <ButtonLink href="/admin/items/new">{t("items.add")}</ButtonLink>}
        >
          {filtered ? null : t("items.empty.body")}
        </EmptyState>
      ) : (
        <ul className="card flex flex-col divide-y divide-border overflow-hidden">
          {items.map((item, i) => {
            const pending = pendingByItem.get(item.id) ?? 0;
            return (
              <li key={item.id}>
                <Link href={`/admin/items/${item.id}`} className="flex items-center gap-4 px-4 py-3 transition-colors hover:bg-surface">
                  <Thumb item={item} url={urls[i]} />
                  <div className="flex min-w-0 flex-1 flex-col gap-1">
                    <p className="truncate font-medium">
                      {t(`category.${item.category}`)}
                      {item.colors.length ? <span className="font-normal text-muted"> · {item.colors.map((c) => t(`color.${c}`)).join(", ")}</span> : null}
                    </p>
                    <p className="truncate text-sm text-muted">
                      {item.foundLocationName} · {foundAgo(item.foundAt, undefined, school.timeZone)}
                      {item.note ? ` · ${item.note}` : ""}
                    </p>
                  </div>
                  <div className="hidden flex-wrap items-center justify-end gap-2 sm:flex">
                    {pending ? (
                      <span className="rounded-full bg-accent px-2.5 py-0.5 text-sm font-semibold text-accent-foreground">
                        {t("items.pendingClaims", { count: pending })}
                      </span>
                    ) : null}
                    <VisibilityBadge visibility={item.visibility} />
                    <StatusBadge status={item.status} />
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
