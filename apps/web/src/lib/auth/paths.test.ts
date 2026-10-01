import { describe, expect, it } from "vitest";
import { isStaffOnlyPath } from "./paths";
import { safeNextPath } from "./provider";

describe("isStaffOnlyPath", () => {
  it.each(["/admin", "/admin/items", "/admin/claims/1", "/setup/2", "/setup/7"])("%s needs sign-in", (p) => {
    expect(isStaffOnlyPath(p)).toBe(true);
  });
  it.each(["/", "/login", "/setup", "/setup/1", "/s/demo-high-school", "/administrator", "/setup/8"])("%s is open", (p) => {
    expect(isStaffOnlyPath(p)).toBe(false);
  });
});

describe("safeNextPath", () => {
  it("keeps same-site paths", () => {
    expect(safeNextPath("/admin/claims?x=1")).toBe("/admin/claims?x=1");
  });
  it.each(["https://evil.example", "//evil.example", "/\\evil.example", "javascript:alert(1)", "", null, undefined])(
    "replaces %s with the fallback",
    (p) => {
      expect(safeNextPath(p)).toBe("/admin");
    },
  );
});
