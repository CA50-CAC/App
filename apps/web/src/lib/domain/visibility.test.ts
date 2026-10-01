import { describe, expect, it } from "vitest";
import type { StaffItem } from "./types";
import { toStudentView } from "./visibility";

function item(overrides: Partial<StaffItem> = {}): StaffItem {
  return {
    id: "item-1",
    schoolId: "school-a",
    status: "available",
    category: "electronics",
    colors: ["black"],
    note: "cracked corner, sticker of a cat",
    foundLocationId: "loc-1",
    foundLocationName: "Library",
    foundAt: "2026-09-20T15:00:00.000Z",
    visibility: "full",
    ownerHint: "Name on case: J. Rivera",
    staffNote: "Kept in drawer 2; check the scratch on the back",
    photoPath: "school-a/item-1.jpg",
    createdAt: "2026-09-20T15:05:00.000Z",
    resolvedAt: null,
    ...overrides,
  };
}

describe("toStudentView", () => {
  it("shows photo and note for Full items", () => {
    const view = toStudentView(item(), "https://signed/photo");
    expect(view).toMatchObject({ visibility: "full", photoUrl: "https://signed/photo", note: item().note });
  });

  it("never includes a photo or note for Limited items, even if a URL is passed in", () => {
    const view = toStudentView(item({ visibility: "limited" }), "https://signed/photo");
    expect(view).not.toBeNull();
    expect(view).not.toHaveProperty("photoUrl");
    expect(view).not.toHaveProperty("note");
    const json = JSON.stringify(view);
    expect(json).not.toContain("https://signed/photo");
    expect(json).not.toContain("cracked corner");
    expect(json).not.toContain("item-1.jpg");
  });

  it("hides Staff-only items completely", () => {
    expect(toStudentView(item({ visibility: "staff_only" }), null)).toBeNull();
  });

  it("hides items that are no longer available", () => {
    for (const status of ["claimed", "returned", "donated", "removed"] as const) {
      expect(toStudentView(item({ status }), null)).toBeNull();
    }
  });

  it("never leaks the private staff note", () => {
    for (const visibility of ["full", "limited"] as const) {
      const view = toStudentView(item({ visibility }), null);
      expect(view).not.toHaveProperty("staffNote");
      expect(JSON.stringify(view)).not.toContain("drawer 2");
    }
  });

  it("never leaks the owner hint, only a badge", () => {
    for (const visibility of ["full", "limited"] as const) {
      const view = toStudentView(item({ visibility }), null);
      expect(JSON.stringify(view)).not.toContain("Rivera");
      expect(view?.hasNameLabel).toBe(true);
    }
    expect(toStudentView(item({ ownerHint: null }), null)?.hasNameLabel).toBe(false);
    expect(toStudentView(item({ ownerHint: "   " }), null)?.hasNameLabel).toBe(false);
  });

  it("does not expose school id, photo path, or internal timestamps", () => {
    const view = toStudentView(item(), null);
    expect(Object.keys(view!).sort()).toEqual(
      ["category", "colors", "foundAt", "foundLocationName", "hasNameLabel", "id", "note", "photoUrl", "visibility"].sort(),
    );
  });
});
