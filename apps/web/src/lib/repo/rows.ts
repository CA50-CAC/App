/**
 * Turns database rows (snake_case, as both PGlite and Supabase's API return
 * them) into the app's shapes (camelCase). Both adapters use these, so a
 * column is mapped the same way everywhere.
 *
 * Timestamps: PGlite returns Date objects and Supabase returns strings, so
 * everything is normalized to an ISO string.
 */
import type { CategoryDefaults } from "@/lib/domain/categories";
import { PRESETS } from "@/lib/domain/categories";
import type { Category, Color, StaffItem, Visibility } from "@/lib/domain/types";
import type { StudentItem } from "@/lib/domain/visibility";
import type { Claim, Location, Member, PublicSchool, School, StaffInvite } from "./interface";

export type DbRow = Record<string, unknown>;

export function iso(v: unknown): string {
  if (v instanceof Date) return v.toISOString();
  return new Date(String(v)).toISOString();
}

export function isoOrNull(v: unknown): string | null {
  return v == null ? null : iso(v);
}

const str = (v: unknown): string => String(v);
const strOrNull = (v: unknown): string | null => (v == null ? null : String(v));

/** Columns to select for a school, shared by both adapters. */
export const SCHOOL_COLUMNS =
  "id, slug, name, district, time_zone, logo_path, status, setup_step, join_code, photo_retention_days, donate_after_days, pickup_location, pickup_hours, needs_manual_review, created_at, launched_at";

export function toSchool(r: DbRow): School {
  return {
    id: str(r.id),
    slug: str(r.slug),
    name: str(r.name),
    district: strOrNull(r.district),
    timeZone: str(r.time_zone),
    logoPath: strOrNull(r.logo_path),
    status: r.status as School["status"],
    setupStep: Number(r.setup_step),
    joinCode: str(r.join_code),
    photoRetentionDays: Number(r.photo_retention_days),
    donateAfterDays: Number(r.donate_after_days),
    pickupLocation: strOrNull(r.pickup_location),
    pickupHours: strOrNull(r.pickup_hours),
    needsManualReview: Boolean(r.needs_manual_review),
    createdAt: iso(r.created_at),
    launchedAt: isoOrNull(r.launched_at),
  };
}

export const PUBLIC_SCHOOL_COLUMNS = "id, slug, name, logo_path, pickup_location, pickup_hours, donate_after_days";

export function toPublicSchool(r: DbRow): PublicSchool {
  return {
    id: str(r.id),
    slug: str(r.slug),
    name: str(r.name),
    logoPath: strOrNull(r.logo_path),
    pickupLocation: strOrNull(r.pickup_location),
    pickupHours: strOrNull(r.pickup_hours),
    donateAfterDays: Number(r.donate_after_days),
  };
}

export function toLocation(r: DbRow): Location {
  return { id: str(r.id), name: str(r.name), sort: Number(r.sort) };
}

export function toMember(r: DbRow): Member {
  return { userId: str(r.user_id), email: str(r.email), role: r.role as Member["role"], createdAt: iso(r.created_at) };
}

export function toInvite(r: DbRow): StaffInvite {
  return {
    id: str(r.id),
    email: str(r.email),
    role: r.role as StaffInvite["role"],
    createdAt: iso(r.created_at),
    acceptedAt: isoOrNull(r.accepted_at),
  };
}

export const ITEM_COLUMNS =
  "id, school_id, status, category, colors, note, found_location_id, found_at, visibility, owner_hint, staff_note, photo_path, created_at, resolved_at";

/** `locationName` comes from a join, which each adapter writes its own way. */
export function toStaffItem(r: DbRow, locationName: string): StaffItem {
  return {
    id: str(r.id),
    schoolId: str(r.school_id),
    status: r.status as StaffItem["status"],
    category: r.category as Category,
    colors: ((r.colors as string[] | null) ?? []) as Color[],
    note: strOrNull(r.note),
    foundLocationId: str(r.found_location_id),
    foundLocationName: locationName,
    foundAt: iso(r.found_at),
    visibility: r.visibility as Visibility,
    ownerHint: strOrNull(r.owner_hint),
    staffNote: strOrNull(r.staff_note),
    photoPath: strOrNull(r.photo_path),
    createdAt: iso(r.created_at),
    resolvedAt: isoOrNull(r.resolved_at),
  };
}

export const STUDENT_ITEM_COLUMNS = "id, category, colors, found_location_name, found_at, visibility, photo_path, note, has_name_label";

/**
 * A row of the `student_items` view to what the browser gets. Like
 * toStudentView(), it builds the object field by field, and Limited items get
 * no photoUrl or note keys at all. The view has already blanked them; this is
 * the second guard.
 */
export async function toStudentItem(r: DbRow, photoUrl: (path: string) => Promise<string | null>): Promise<StudentItem> {
  const base = {
    id: str(r.id),
    category: r.category as Category,
    colors: ((r.colors as string[] | null) ?? []) as Color[],
    foundLocationName: str(r.found_location_name),
    foundAt: iso(r.found_at),
    hasNameLabel: Boolean(r.has_name_label),
  };
  if (r.visibility !== "full") return { ...base, visibility: "limited" };
  const path = strOrNull(r.photo_path);
  return { ...base, visibility: "full", photoUrl: path ? await photoUrl(path) : null, note: strOrNull(r.note) };
}

export const CLAIM_COLUMNS = "id, item_id, claimant_detail, contact_email, status, created_at, reviewed_at, picked_up_at";

export function toClaim(r: DbRow): Claim {
  return {
    id: str(r.id),
    itemId: str(r.item_id),
    claimantDetail: str(r.claimant_detail),
    contactEmail: strOrNull(r.contact_email),
    status: r.status as Claim["status"],
    createdAt: iso(r.created_at),
    reviewedAt: isoOrNull(r.reviewed_at),
    pickedUpAt: isoOrNull(r.picked_up_at),
  };
}

/** Categories the school hasn't saved yet fall back to the Standard preset. */
export function toCategoryDefaults(rows: DbRow[]): CategoryDefaults {
  const out: CategoryDefaults = { ...PRESETS.standard };
  for (const r of rows) out[r.category as Category] = r.default_visibility as Visibility;
  return out;
}

/** Turns NewItemInput-style camelCase fields into item columns. Only keys present in `patch` are included. */
export function itemColumns(patch: Partial<Record<string, unknown>>): DbRow {
  const map: Record<string, string> = {
    category: "category",
    colors: "colors",
    note: "note",
    foundLocationId: "found_location_id",
    foundAt: "found_at",
    visibility: "visibility",
    ownerHint: "owner_hint",
    staffNote: "staff_note",
    photoPath: "photo_path",
  };
  const out: DbRow = {};
  for (const [key, col] of Object.entries(map)) {
    if (key in patch && patch[key] !== undefined) out[col] = patch[key];
  }
  return out;
}

/** Statuses that count as "resolved" for retention: the item has left the shelf. */
export const RESOLVED_STATUSES = ["returned", "donated", "removed"] as const;
