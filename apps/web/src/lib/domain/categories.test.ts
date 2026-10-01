import { describe, expect, it } from "vitest";
import { PRESETS, PRESET_NAMES, clampVisibility, isAllowedVisibility, matchingPreset } from "./categories";
import { CATEGORIES } from "./types";

describe("category visibility rules", () => {
  it("never allows Wallet, ID, or cards to be Full", () => {
    expect(isAllowedVisibility("wallet_id", "full")).toBe(false);
    expect(clampVisibility("wallet_id", "full")).toBe("limited");
    expect(isAllowedVisibility("wallet_id", "limited")).toBe(true);
    expect(isAllowedVisibility("wallet_id", "staff_only")).toBe(true);
  });

  it("allows every level for ordinary categories", () => {
    for (const v of ["full", "limited", "staff_only"] as const) {
      expect(isAllowedVisibility("clothing", v)).toBe(true);
    }
  });

  it("every preset covers every category and respects the wallet rule", () => {
    for (const name of PRESET_NAMES) {
      const preset = PRESETS[name];
      expect(Object.keys(preset).sort()).toEqual([...CATEGORIES].sort());
      expect(preset.wallet_id).not.toBe("full");
    }
  });

  it("presets are distinct and recognizable", () => {
    for (const name of PRESET_NAMES) expect(matchingPreset(PRESETS[name])).toBe(name);
    expect(matchingPreset({ ...PRESETS.standard, clothing: "staff_only" })).toBeNull();
  });
});
