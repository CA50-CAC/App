/**
 * The student view of an item. This is the core privacy rule:
 *
 * | Level      | Students see                                               |
 * |------------|------------------------------------------------------------|
 * | Full       | photo, category, colors, note, found location, found date  |
 * | Limited    | category, colors, found location, found date. No photo/note |
 * | Staff-only | nothing. The item is not listed.                            |
 *
 * The owner hint is never sent to students. They only learn that a hint exists
 * (the "has a name label" badge).
 *
 * This function builds a brand-new object field by field instead of copying the
 * staff item and deleting keys. That way a new private column added later can't
 * leak by accident: it has to be added here on purpose.
 *
 * The database has a second guard: students are served from the `student_items`
 * view, which never returns the photo or note of a non-Full item.
 */
import type { Category, Color, StaffItem } from "./types";

interface StudentItemBase {
  id: string;
  category: Category;
  colors: Color[];
  foundLocationName: string;
  foundAt: string;
  hasNameLabel: boolean;
}

export interface FullStudentItem extends StudentItemBase {
  visibility: "full";
  photoUrl: string | null;
  note: string | null;
}

/** No photoUrl or note keys at all, not even as null. */
export interface LimitedStudentItem extends StudentItemBase {
  visibility: "limited";
}

export type StudentItem = FullStudentItem | LimitedStudentItem;

/**
 * Turn a staff item into what a student may see, or null if they may not see it.
 * `photoUrl` is passed in because signed URLs are made by the storage layer.
 */
export function toStudentView(item: StaffItem, photoUrl: string | null): StudentItem | null {
  if (item.status !== "available") return null;
  if (item.visibility === "staff_only") return null;

  const base: StudentItemBase = {
    id: item.id,
    category: item.category,
    colors: [...item.colors],
    foundLocationName: item.foundLocationName,
    foundAt: item.foundAt,
    hasNameLabel: Boolean(item.ownerHint && item.ownerHint.trim()),
  };

  if (item.visibility === "limited") {
    return { ...base, visibility: "limited" };
  }
  return { ...base, visibility: "full", photoUrl, note: item.note };
}
