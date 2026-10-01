import { describe, expect, it } from "vitest";
import { CATEGORIES, COLORS } from "@/lib/domain/types";
import { demoItemSvg } from "./images";

describe("demo item images", () => {
  it("are deterministic", () => {
    expect(demoItemSvg("bag", "blue", 1)).toBe(demoItemSvg("bag", "blue", 1));
    expect(demoItemSvg("bag", "blue", 1)).not.toBe(demoItemSvg("bag", "red", 1));
  });

  it("are plain SVG with no scripts, links, or external references", () => {
    for (const c of CATEGORIES) {
      for (const color of COLORS) {
        const svg = demoItemSvg(c, color);
        expect(svg.startsWith("<svg ")).toBe(true);
        expect(svg).not.toMatch(/<script|on\w+=|href=|<image|<foreignObject/i);
      }
    }
  });
});
