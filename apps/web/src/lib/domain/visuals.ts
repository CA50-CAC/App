/**
 * Drawing data for categories and colors, shared by the UI (React icons, color
 * swatches) and the demo image generator (plain SVG files). Pure data, so it
 * works on the server, in the browser, and in scripts.
 */
import type { Category, Color } from "./types";

/** 24x24 stroke icons, one path string per category. */
export const CATEGORY_ICON: Record<Category, string> = {
  clothing: "M8 3 3 6l2 4 2-1v12h10V9l2 1 2-4-5-3a4 4 0 0 1-8 0Z",
  bottle_lunchbox: "M10 2h4v3l1 2v13a2 2 0 0 1-2 2h-2a2 2 0 0 1-2-2V7l1-2Z M9 11h6",
  bag: "M5 8h14l1 13H4Z M9 8V6a3 3 0 0 1 6 0v2 M8 13h8",
  books_stationery: "M4 4h6a2 2 0 0 1 2 2v14a2 2 0 0 0-2-2H4Z M20 4h-6a2 2 0 0 0-2 2v14a2 2 0 0 1 2-2h6Z",
  calculator_supplies: "M6 2h12v20H6Z M8.5 5h7v4h-7Z M9 13h.01 M12 13h.01 M15 13h.01 M9 17h.01 M12 17h.01 M15 17h.01",
  sports_gear: "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18Z M3.5 9.5c5 2 12 2 17 0 M3.5 14.5c5-2 12-2 17 0",
  electronics: "M7 2h10a1 1 0 0 1 1 1v18a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1Z M11 18h2",
  earbuds_headphones: "M4 15v-3a8 8 0 0 1 16 0v3 M4 14h3v6H5a1 1 0 0 1-1-1Z M20 14h-3v6h2a1 1 0 0 0 1-1Z",
  keys: "M8 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8Z M12 12h9 M18 12v3 M15 12v2",
  wallet_id: "M3 7h16a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H3Z M3 7l12-3v3 M16 13.5h2",
  glasses_medical: "M2 14a4 4 0 1 0 8 0 4 4 0 0 0-8 0Z M14 14a4 4 0 1 0 8 0 4 4 0 0 0-8 0Z M10 14h4 M2.5 12 4 7 M21.5 12 20 7",
  jewelry_watch: "M9 2h6l1 5H8Z M8 17h8l-1 5H9Z M12 7a5 5 0 1 1 0 10 5 5 0 0 1 0-10Z M12 10v2l1.5 1.5",
  instrument: "M9 18V5l12-2v13 M9 18a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z M21 16a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z",
  other: "M12 3l9 5v8l-9 5-9-5V8Z M12 12v9 M3 8l9 4 9-4",
};

/** Display colors for the named palette. Multicolor is drawn as a gradient. */
export const COLOR_HEX: Record<Color, string> = {
  black: "#1f2328",
  white: "#f8fafc",
  gray: "#8b949e",
  red: "#dc2626",
  orange: "#ea580c",
  yellow: "#eab308",
  green: "#16a34a",
  blue: "#2563eb",
  purple: "#7c3aed",
  pink: "#db2777",
  brown: "#92400e",
  beige: "#d6c7a1",
  silver: "#c0c6cc",
  gold: "#d4a017",
  multicolor: "#7c3aed",
};

export const MULTICOLOR_GRADIENT = "linear-gradient(135deg, #dc2626, #eab308, #16a34a, #2563eb, #7c3aed)";

/** Background for a swatch or a Limited item's tile. */
export function colorBackground(color: Color | undefined): string {
  if (!color) return "var(--surface)";
  return color === "multicolor" ? MULTICOLOR_GRADIENT : COLOR_HEX[color];
}

/** Dark or light ink that stays readable on a given color. */
export function inkFor(color: Color | undefined): string {
  if (!color || color === "multicolor") return "#ffffff";
  const hex = COLOR_HEX[color];
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
  return 0.299 * r + 0.587 * g + 0.114 * b > 150 ? "#11181c" : "#ffffff";
}
