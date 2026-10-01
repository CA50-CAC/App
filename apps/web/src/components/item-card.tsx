/**
 * The card a student sees for one found item, in the gallery and in the
 * setup wizard's privacy preview (same component, so the preview is exact).
 *
 * It only accepts a StudentItem, so it can't show a field students may not
 * see: a Limited item has no photo or note to show.
 */
import Link from "next/link";
import type { StudentItem } from "@/lib/domain/visibility";
import { foundAgo } from "@/lib/i18n/dates";
import { t } from "@/lib/i18n";
import { CategoryIcon, CategoryTile } from "./item-visuals";

export function itemAltText(item: StudentItem): string {
  const colors = item.colors.map((c) => t(`color.${c}`).toLowerCase()).join(" and ");
  return `${colors ? `${colors} ` : ""}${t(`category.${item.category}`).toLowerCase()}, found at ${item.foundLocationName}`;
}

export function ItemCard({
  item,
  href,
  now,
  timeZone,
}: {
  item: StudentItem;
  href?: string;
  now?: Date;
  timeZone?: string;
}) {
  const title = t(`category.${item.category}`);
  const media =
    item.visibility === "full" && item.photoUrl ? (
      // Plain <img>: photos are short-lived signed URLs, not static assets.
      // eslint-disable-next-line @next/next/no-img-element
      <img src={item.photoUrl} alt={itemAltText(item)} className="aspect-square w-full object-cover" loading="lazy" />
    ) : (
      <CategoryTile category={item.category} colors={item.colors} className="aspect-square w-full" />
    );

  const body = (
    <>
      <div className="relative overflow-hidden rounded-t-2xl bg-surface">
        {media}
        {item.visibility === "limited" ? (
          <span className="absolute top-2 left-2 rounded-full bg-background/90 px-2 py-0.5 text-xs font-medium text-foreground">
            {t("gallery.noPhoto")}
          </span>
        ) : null}
      </div>
      <div className="flex flex-1 flex-col gap-1 p-3">
        <p className="flex items-center gap-1.5 font-semibold">
          <CategoryIcon category={item.category} className="size-4 shrink-0 text-muted" />
          <span className="truncate">{title}</span>
        </p>
        {item.colors.length ? <p className="text-sm text-muted">{item.colors.map((c) => t(`color.${c}`)).join(", ")}</p> : null}
        <p className="text-sm text-muted">
          {item.foundLocationName} · {foundAgo(item.foundAt, now, timeZone)}
        </p>
        {item.visibility === "full" && item.note ? <p className="line-clamp-2 text-sm">{item.note}</p> : null}
        {item.hasNameLabel ? (
          <p className="mt-1 self-start rounded-full bg-accent-soft px-2 py-0.5 text-xs font-medium text-accent">{t("item.hasNameLabel")}</p>
        ) : null}
      </div>
    </>
  );

  const cls = "flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-background";
  return href ? (
    <Link href={href} className={`${cls} transition-shadow hover:shadow-md`}>
      {body}
    </Link>
  ) : (
    <div className={cls}>{body}</div>
  );
}
