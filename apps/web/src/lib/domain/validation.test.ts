import { describe, expect, it } from "vitest";
import { ClaimSchema, ItemSchema, PoliciesSchema, SchoolProfileSchema, fieldErrors } from "./validation";

const item = {
  category: "bag",
  colors: ["black"],
  note: "  ",
  foundLocationId: "6f1d1c3e-2c55-4c2f-9d63-1c8a8f2f3b11",
  foundAt: "2026-09-20",
  visibility: "full",
  ownerHint: "",
  staffNote: "drawer 2",
};

describe("validation", () => {
  it("trims and turns empty optional text into null", () => {
    const v = ItemSchema.parse(item);
    expect(v.note).toBeNull();
    expect(v.ownerHint).toBeNull();
    expect(v.staffNote).toBe("drawer 2");
  });

  it("wallets can't be Full", () => {
    const r = ItemSchema.safeParse({ ...item, category: "wallet_id" });
    expect(r.success).toBe(false);
    expect(fieldErrors(r.error!)).toEqual({ visibility: "visibility.wallet_rule" });
  });

  it("rejects found dates in the future and more than 4 colors", () => {
    const r = ItemSchema.safeParse({ ...item, foundAt: "2999-01-01", colors: ["black", "white", "red", "blue", "gray"] });
    expect(Object.keys(fieldErrors(r.error!)).sort()).toEqual(["colors", "foundAt"]);
  });

  it("school profile needs a name and a real time zone", () => {
    const r = SchoolProfileSchema.safeParse({ name: " A ", timeZone: "Mars/Olympus" });
    expect(fieldErrors(r.error!)).toEqual({ name: "school.error.name", timeZone: "school.error.timeZone" });
    expect(SchoolProfileSchema.parse({ name: "Lincoln High", timeZone: "America/Chicago", district: "" }).district).toBeNull();
  });

  it("policies coerce numbers from form strings", () => {
    expect(PoliciesSchema.parse({ pickupLocation: "Office", pickupHours: "8-4", photoRetentionDays: "7", donateAfterDays: "30" })).toMatchObject({
      photoRetentionDays: 7,
      donateAfterDays: 30,
    });
  });

  it("claims need a real detail; the email is optional", () => {
    expect(ClaimSchema.safeParse({ itemId: item.foundLocationId, claimantDetail: "hi" }).success).toBe(false);
    expect(ClaimSchema.parse({ itemId: item.foundLocationId, claimantDetail: "Sticker of a fox", contactEmail: "" }).contactEmail).toBeNull();
    expect(ClaimSchema.safeParse({ itemId: item.foundLocationId, claimantDetail: "Sticker", contactEmail: "nope" }).success).toBe(false);
  });
});
