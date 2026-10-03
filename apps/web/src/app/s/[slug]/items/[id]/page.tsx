/**
 * One item, as a student sees it, with the claim form. The item comes from
 * the student data layer (getItem returns null for anything students can't
 * see), so a Limited item here simply has no photo or note to show.
 */
import Link from "next/link";
import { itemAltText } from "@/components/item-card";
import { CategoryTile, ColorChips } from "@/components/item-visuals";
import { EmptyState } from "@/components/ui/alert";
import { buttonClass, ButtonLink } from "@/components/ui/button";
import { foundAgo } from "@/lib/i18n/dates";
import { t } from "@/lib/i18n";
import { getStudentContext } from "@/lib/server/student-context";
import { ClaimForm } from "./claim-form";

export default async function StudentItemPage({ params }: PageProps<"/s/[slug]/items/[id]">) {
  const { slug, id } = await params;
  const { students, school } = await getStudentContext(slug);
  const item = /^[0-9a-f-]{36}$/.test(id) ? await students.getItem(id) : null;
  const back = (
    <Link href={`/s/${slug}`} className="inline-flex min-h-11 items-center self-start rounded-full px-1 text-sm font-semibold text-accent hover:underline underline-offset-4">
      ← {t("gallery.back")}
    </Link>
  );

  if (!item) {
    return (
      <div className="flex flex-col gap-4">
        {back}
        <EmptyState title={t("detail.gone")} action={<ButtonLink href={`/s/${slug}`}>{t("gallery.back")}</ButtonLink>} />
      </div>
    );
  }

  const pickup = school.pickupLocation ?? "the front office";
  return (
    <div className="flex flex-col gap-6">
      {back}
      <div className="grid gap-6 md:grid-cols-2 md:gap-10">
        <div className="card overflow-hidden p-2">
          {item.visibility === "full" && item.photoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={item.photoUrl} alt={itemAltText(item)} className="aspect-square w-full rounded-[0.9rem] object-cover" />
          ) : (
            <CategoryTile category={item.category} colors={item.colors} className="aspect-square w-full rounded-[0.9rem]" />
          )}
        </div>
        <div className="flex flex-col gap-5 md:py-2">
          <div className="flex flex-col gap-1.5">
            <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">{t(`category.${item.category}`)}</h1>
            <p className="text-muted">{t("detail.found", { when: foundAgo(item.foundAt).toLowerCase(), place: item.foundLocationName })}</p>
          </div>
          <ColorChips colors={item.colors} />
          {item.hasNameLabel ? (
            <p className="self-start rounded-full bg-accent-soft px-3 py-1 text-sm font-medium text-accent">{t("item.hasNameLabel")}</p>
          ) : null}
          {item.visibility === "full" && item.note ? (
            <div>
              <h2 className="text-sm font-medium text-muted">{t("detail.description")}</h2>
              <p>{item.note}</p>
            </div>
          ) : null}
          {item.visibility === "limited" ? <p className="rounded-2xl border border-border bg-surface p-4 text-sm">{t("detail.limited")}</p> : null}
          <a href="#claim" className={`${buttonClass("primary")} self-start max-md:hidden md:mt-2`}>
            {t("detail.mine")}
          </a>
        </div>
      </div>

      <section id="claim" aria-labelledby="claim-title" className="card flex scroll-mt-24 flex-col gap-3 p-5 sm:p-8">
        <h2 id="claim-title" className="text-2xl font-semibold tracking-tight">
          {t("detail.mine")}
        </h2>
        <p className="text-muted">{t("claim.lead")}</p>
        <ClaimForm slug={slug} itemId={item.id} pickup={pickup} hours={school.pickupHours ?? ""} />
      </section>
    </div>
  );
}
