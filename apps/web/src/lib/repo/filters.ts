/**
 * Student date filters use whole days: "found from Sept 1 to Sept 3" includes
 * everything on Sept 3. Shared by both adapters so they agree on the edges.
 */
import type { StudentItemFilters } from "./interface";

const DAY_MS = 24 * 60 * 60 * 1000;

export function studentDateRange(filters: StudentItemFilters): { from: string | null; to: string | null } {
  const from = filters.foundAfter ? Date.parse(filters.foundAfter) : NaN;
  const before = filters.foundBefore ? Date.parse(filters.foundBefore) : NaN;
  return {
    from: Number.isNaN(from) ? null : new Date(from).toISOString(),
    to: Number.isNaN(before) ? null : new Date(before + DAY_MS).toISOString(),
  };
}
