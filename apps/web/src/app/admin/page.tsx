import { t } from "@/lib/i18n";
import { getStaffContext } from "@/lib/server/staff-context";

export default async function AdminHome() {
  const { school } = await getStaffContext();
  return (
    <h1 className="text-2xl font-semibold">
      {t("nav.items")} · {school.name}
    </h1>
  );
}
