/**
 * Today's gallery search: a plain filter, not matching.
 *
 * The app calls `searchItems(schoolId, query, filters)` (in src/lib/search.ts),
 * which loads the items a student may see and passes them here. When the
 * matching engine (SPEC Section 6) is ready, it replaces this function and
 * nothing else in the app needs to change. That's why it returns ranked ids,
 * not items.
 *
 * Current behavior:
 * - filters narrow by category, location, and date range
 * - every word of the text query must match the category name, a color, or the note
 * - results are sorted newest first
 */
import { t } from "@/lib/i18n";
import type { StudentItem } from "./visibility";
import type { Category } from "./types";

export interface SearchFilters {
  categories?: Category[];
  locationNames?: string[];
  foundAfter?: string; // ISO date, inclusive
  foundBefore?: string; // ISO date, inclusive
}

function searchableText(item: StudentItem): string {
  const parts = [t(`category.${item.category}` as const), item.category.replace(/_/g, " ")];
  for (const c of item.colors) parts.push(t(`color.${c}` as const), c);
  if (item.visibility === "full" && item.note) parts.push(item.note);
  return parts.join(" ").toLowerCase();
}

export function filterItems(items: StudentItem[], query: string, filters: SearchFilters = {}): string[] {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  const after = filters.foundAfter ? Date.parse(filters.foundAfter) : -Infinity;
  const before = filters.foundBefore ? Date.parse(filters.foundBefore) + 24 * 60 * 60 * 1000 : Infinity;

  return items
    .filter((item) => !filters.categories?.length || filters.categories.includes(item.category))
    .filter((item) => !filters.locationNames?.length || filters.locationNames.includes(item.foundLocationName))
    .filter((item) => {
      const found = Date.parse(item.foundAt);
      return found >= after && found < before;
    })
    .filter((item) => {
      if (words.length === 0) return true;
      const text = searchableText(item);
      return words.every((w) => text.includes(w));
    })
    .sort((a, b) => Date.parse(b.foundAt) - Date.parse(a.foundAt))
    .map((item) => item.id);
}
