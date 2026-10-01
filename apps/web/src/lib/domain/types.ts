/**
 * Core domain types shared by the UI, server routes, and data adapters.
 *
 * These mirror the Postgres enums in supabase/migrations/0001_init.sql.
 * If you change one, change the other.
 */

export const VISIBILITIES = ["full", "limited", "staff_only"] as const;
export type Visibility = (typeof VISIBILITIES)[number];

export const ITEM_STATUSES = ["available", "claimed", "returned", "donated", "removed"] as const;
export type ItemStatus = (typeof ITEM_STATUSES)[number];

export const CLAIM_STATUSES = ["pending", "approved", "rejected", "picked_up"] as const;
export type ClaimStatus = (typeof CLAIM_STATUSES)[number];

export const SCHOOL_STATUSES = ["pending_review", "approved", "rejected"] as const;
export type SchoolStatus = (typeof SCHOOL_STATUSES)[number];

export const MEMBER_ROLES = ["owner", "staff"] as const;
export type MemberRole = (typeof MEMBER_ROLES)[number];

export const CATEGORIES = [
  "clothing",
  "bottle_lunchbox",
  "bag",
  "books_stationery",
  "calculator_supplies",
  "sports_gear",
  "electronics",
  "earbuds_headphones",
  "keys",
  "wallet_id",
  "glasses_medical",
  "jewelry_watch",
  "instrument",
  "other",
] as const;
export type Category = (typeof CATEGORIES)[number];

/** A small named palette. Finders pick from these; matching will use them later. */
export const COLORS = [
  "black",
  "white",
  "gray",
  "red",
  "orange",
  "yellow",
  "green",
  "blue",
  "purple",
  "pink",
  "brown",
  "beige",
  "silver",
  "gold",
  "multicolor",
] as const;
export type Color = (typeof COLORS)[number];

/** A found item as staff see it: every field. Never send this shape to a student. */
export interface StaffItem {
  id: string;
  schoolId: string;
  status: ItemStatus;
  category: Category;
  colors: Color[];
  note: string | null;
  foundLocationId: string;
  foundLocationName: string;
  foundAt: string; // ISO timestamp
  visibility: Visibility;
  /** Staff-only text such as a name written on a label. Never shown to students. */
  ownerHint: string | null;
  photoPath: string | null;
  createdAt: string;
  resolvedAt: string | null;
}
