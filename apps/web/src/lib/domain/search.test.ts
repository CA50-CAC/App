import { describe, expect, it } from "vitest";
import { filterItems } from "./search";
import type { StudentItem } from "./visibility";

const items: StudentItem[] = [
  {
    id: "bottle-old",
    visibility: "full",
    category: "bottle_lunchbox",
    colors: ["black"],
    note: "dented, sticker on the bottom",
    photoUrl: null,
    foundLocationName: "Gym",
    foundAt: "2026-09-01T10:00:00.000Z",
    hasNameLabel: false,
  },
  {
    id: "bottle-new",
    visibility: "full",
    category: "bottle_lunchbox",
    colors: ["black", "silver"],
    note: null,
    photoUrl: null,
    foundLocationName: "Cafeteria",
    foundAt: "2026-09-25T10:00:00.000Z",
    hasNameLabel: false,
  },
  {
    id: "phone",
    visibility: "limited",
    category: "electronics",
    colors: ["blue"],
    foundLocationName: "Library",
    foundAt: "2026-09-20T10:00:00.000Z",
    hasNameLabel: true,
  },
];

describe("filterItems", () => {
  it("returns everything, newest first, for an empty query", () => {
    expect(filterItems(items, "")).toEqual(["bottle-new", "phone", "bottle-old"]);
  });

  it("matches category names, colors, and notes", () => {
    expect(filterItems(items, "black water bottle")).toEqual(["bottle-new", "bottle-old"]);
    expect(filterItems(items, "sticker")).toEqual(["bottle-old"]);
    expect(filterItems(items, "blue phone")).toEqual(["phone"]);
  });

  it("applies category, location, and date filters", () => {
    expect(filterItems(items, "", { categories: ["electronics"] })).toEqual(["phone"]);
    expect(filterItems(items, "", { locationNames: ["Gym"] })).toEqual(["bottle-old"]);
    expect(filterItems(items, "", { foundAfter: "2026-09-20", foundBefore: "2026-09-25" })).toEqual([
      "bottle-new",
      "phone",
    ]);
  });
});
