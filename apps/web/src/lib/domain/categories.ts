/**
 * Category privacy defaults and presets.
 *
 * Each school stores a default visibility per category. New items start with
 * their category's default, and staff can override it per item.
 *
 * One hard rule: Wallet, ID, or cards can never be Full. We enforce it here,
 * in the server routes, and with a CHECK constraint in the database.
 */
import type { Category, Visibility } from "./types";
import { CATEGORIES } from "./types";

export type CategoryDefaults = Record<Category, Visibility>;

/** Categories that can never be shown with a photo. */
export const NEVER_FULL: ReadonlySet<Category> = new Set<Category>(["wallet_id"]);

export function isAllowedVisibility(category: Category, visibility: Visibility): boolean {
  return !(NEVER_FULL.has(category) && visibility === "full");
}

/**
 * Returns the visibility to actually use. If someone asks for a level that is
 * not allowed (Full on a wallet), we fall back to Limited instead of failing.
 * Server routes should still reject the request so the admin sees an error.
 */
export function clampVisibility(category: Category, visibility: Visibility): Visibility {
  return isAllowedVisibility(category, visibility) ? visibility : "limited";
}

function preset(overrides: Partial<CategoryDefaults>, base: Visibility): CategoryDefaults {
  const out = {} as CategoryDefaults;
  for (const c of CATEGORIES) out[c] = clampVisibility(c, overrides[c] ?? base);
  return out;
}

export const PRESET_NAMES = ["standard", "strict", "open"] as const;
export type PresetName = (typeof PRESET_NAMES)[number];

/**
 * Standard: photos for everyday items, no photos for valuables.
 * Strict:   valuables hidden from students entirely; most other items without photos.
 * Open:     photos for everything except wallets and IDs.
 */
export const PRESETS: Record<PresetName, CategoryDefaults> = {
  standard: preset(
    {
      electronics: "limited",
      earbuds_headphones: "limited",
      keys: "limited",
      wallet_id: "limited",
      glasses_medical: "limited",
      jewelry_watch: "limited",
    },
    "full",
  ),
  strict: preset(
    {
      clothing: "full",
      bottle_lunchbox: "full",
      books_stationery: "full",
      sports_gear: "full",
      electronics: "staff_only",
      earbuds_headphones: "staff_only",
      wallet_id: "staff_only",
      jewelry_watch: "staff_only",
    },
    "limited",
  ),
  open: preset({}, "full"),
};

/** Which preset (if any) exactly matches the given defaults. Used to highlight the preset chip. */
export function matchingPreset(defaults: CategoryDefaults): PresetName | null {
  for (const name of PRESET_NAMES) {
    if (CATEGORIES.every((c) => PRESETS[name][c] === defaults[c])) return name;
  }
  return null;
}
