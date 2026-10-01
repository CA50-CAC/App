import { describe, expect, it } from "vitest";
import { foundAgo, isoDay } from "./dates";

const now = new Date("2026-10-01T18:00:00Z");

describe("foundAgo", () => {
  it("says today, yesterday, and n days ago", () => {
    expect(foundAgo("2026-10-01T08:00:00Z", now)).toBe("Today");
    expect(foundAgo("2026-09-30T23:00:00Z", now)).toBe("Yesterday");
    expect(foundAgo("2026-09-27T10:00:00Z", now)).toBe("4 days ago");
    expect(foundAgo("2026-09-01T10:00:00Z", now)).toBe("Sep 1, 2026");
  });

  it("counts days in the school's time zone", () => {
    // 01:00 UTC on Oct 1 is still Sept 30 in Los Angeles.
    expect(foundAgo("2026-10-01T01:00:00Z", now, "America/Los_Angeles")).toBe("Yesterday");
    expect(isoDay(new Date("2026-10-01T01:00:00Z"), "America/Los_Angeles")).toBe("2026-09-30");
  });
});
