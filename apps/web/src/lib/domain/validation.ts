/**
 * Input rules for every form, in one place. Server actions parse with these
 * before anything reaches the data layer; the database has matching CHECK
 * constraints as a second guard.
 *
 * Errors come back keyed by field name so forms can show each message next to
 * its field.
 */
import { z } from "zod";
import { isAllowedVisibility } from "./categories";
import { CATEGORIES, COLORS, ITEM_STATUSES, MEMBER_ROLES, VISIBILITIES } from "./types";

const trimmed = (max: number) => z.string().trim().max(max);
const optionalText = (max: number) =>
  trimmed(max)
    .optional()
    .transform((v) => (v ? v : null));

export function isValidTimeZone(tz: string): boolean {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

export const SchoolProfileSchema = z.object({
  name: trimmed(120).min(2, "school.error.name"),
  district: optionalText(120),
  timeZone: z.string().refine(isValidTimeZone, "school.error.timeZone"),
});

export const PoliciesSchema = z.object({
  pickupLocation: trimmed(120).min(1, "policies.error.pickupLocation"),
  pickupHours: trimmed(120).min(1, "policies.error.pickupHours"),
  photoRetentionDays: z.coerce.number().int().min(0, "policies.error.retention").max(365, "policies.error.retention"),
  donateAfterDays: z.coerce.number().int().min(1, "policies.error.donate").max(365, "policies.error.donate"),
});

export const LocationNamesSchema = z
  .array(trimmed(60).min(1))
  .min(1, "locations.error.none")
  .max(60, "locations.error.tooMany");

export const InviteSchema = z.object({
  email: z.email("invite.error.email").max(254),
  role: z.enum(MEMBER_ROLES),
});

export const ItemSchema = z
  .object({
    category: z.enum(CATEGORIES, "item.error.category"),
    colors: z.array(z.enum(COLORS)).max(4, "item.error.colors"),
    note: optionalText(280),
    foundLocationId: z.uuid("item.error.location"),
    foundAt: z.string().refine((v) => !Number.isNaN(Date.parse(v)), "item.error.foundAt"),
    visibility: z.enum(VISIBILITIES),
    ownerHint: optionalText(120),
    staffNote: optionalText(500),
  })
  .refine((v) => isAllowedVisibility(v.category, v.visibility), { path: ["visibility"], message: "visibility.wallet_rule" })
  .refine((v) => Date.parse(v.foundAt) <= Date.now() + 24 * 60 * 60 * 1000, { path: ["foundAt"], message: "item.error.future" });

export const ItemStatusSchema = z.enum(ITEM_STATUSES);

export const ClaimSchema = z.object({
  itemId: z.uuid(),
  claimantDetail: trimmed(500).min(3, "claim.error.detail"),
  contactEmail: z
    .union([z.literal(""), z.email("claim.error.email").max(254)])
    .optional()
    .transform((v) => (v ? v.toLowerCase() : null)),
});

/** zod issues to { field: messageKey }. The first message per field wins. */
export function fieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "form");
    out[key] ??= issue.message;
  }
  return out;
}
