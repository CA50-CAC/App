import { describe, expect, it } from "vitest";
import {
  CODE_ALPHABET,
  generateClaimCode,
  hashCode,
  normalizeCode,
  slugify,
} from "./codes";

describe("join codes (generated in the database; see tests/db/school-roles.test.ts)", () => {
  it("never use look-alike characters", () => {
    for (const ch of "0O1IL") expect(CODE_ALPHABET).not.toContain(ch);
  });

  it("normalize user input", () => {
    expect(normalizeCode(" demo-2026 ")).toBe("DEMO2026");
    expect(normalizeCode("ab cd")).toBe("ABCD");
  });
});

describe("claim codes", () => {
  it("look like XXXXX-XXXXX", () => {
    expect(generateClaimCode()).toMatch(/^[A-Z2-9]{5}-[A-Z2-9]{5}$/);
  });

  it("hash the same no matter how they are typed", async () => {
    const code = generateClaimCode();
    const hash = await hashCode(code);
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
    expect(await hashCode(code.toLowerCase().replace("-", " "))).toBe(hash);
    expect(await hashCode(generateClaimCode())).not.toBe(hash);
  });
});

describe("slugify", () => {
  it("makes URL-safe slugs", () => {
    expect(slugify("Demo High School")).toBe("demo-high-school");
    expect(slugify("  St. Mary's Académie!! ")).toBe("st-mary-s-academie");
    expect(slugify("!!!")).toBe("school");
  });
});
