/**
 * Checks the color tokens in globals.css meet WCAG AA (4.5:1 for normal text)
 * in both themes, so a tweak to a color can't quietly break readability.
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const css = readFileSync(fileURLToPath(new URL("./globals.css", import.meta.url)), "utf8");

function tokens(block: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const m of block.matchAll(/--([a-z-]+):\s*(#[0-9a-f]{6})/gi)) out[m[1]] = m[2];
  return out;
}

const light = tokens(css.slice(css.indexOf(":root {"), css.indexOf("@media (prefers-color-scheme: dark)")));
const dark = { ...light, ...tokens(css.slice(css.indexOf("@media (prefers-color-scheme: dark)"), css.indexOf("@theme inline"))) };

function luminance(hex: string): number {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

const PAIRS: Array<[string, string]> = [
  ["foreground", "background"],
  ["foreground", "surface"],
  ["muted", "background"],
  ["muted", "surface"],
  ["accent", "background"],
  ["accent-foreground", "accent"],
  ["accent", "accent-soft"],
  ["foreground", "accent-soft"],
  ["danger", "background"],
  ["danger", "danger-soft"],
  ["success", "background"],
  ["success", "success-soft"],
  ["warning", "background"],
  ["warning", "warning-soft"],
];

describe.each([
  ["light", light],
  ["dark", dark],
])("%s theme contrast", (_name, theme) => {
  it.each(PAIRS)("%s on %s is at least 4.5:1", (fg, bg) => {
    expect(theme[fg], fg).toBeDefined();
    expect(theme[bg], bg).toBeDefined();
    expect(contrast(theme[fg], theme[bg])).toBeGreaterThanOrEqual(4.5);
  });
});
