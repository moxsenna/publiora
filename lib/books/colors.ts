/**
 * Curated editorial book cover palette and color resolution.
 * Inspired by classic clothbound books, Penguin Classics, and Apple Books.
 * Deep, tactile, rich tones that maintain strong contrast with white text.
 */

export const EDITORIAL_BOOK_PALETTE = [
  "#1e3a8a", // Classic Deep Navy
  "#881337", // Rich Crimson / Burgundy
  "#064e3b", // Forest Emerald
  "#9a3412", // Warm Rust / Terracotta
  "#312e81", // Deep Indigo
  "#134e4a", // Nordic Pine / Teal
  "#78350f", // Warm Amber / Ochre
  "#581c87", // Royal Violet / Plum
  "#1e293b", // Charcoal Slate
  "#701a75", // Deep Boysenberry
  "#0f766e", // Deep Cyan / Sea Pine
  "#451a03", // Warm Mocha
] as const;

export const CATEGORY_PALETTES: Record<string, readonly string[]> = {
  finance: ["#064e3b", "#0f766e", "#1e3a8a", "#14532d", "#065f46"],
  marketing: ["#9a3412", "#78350f", "#881337", "#b45309", "#c2410c"],
  tech: ["#1e293b", "#1e3a8a", "#3730a3", "#0f172a", "#334155"],
  creative: ["#581c87", "#701a75", "#134e4a", "#4c1d95", "#831843"],
};

export interface ResolveBookCoverColorParams {
  coverColor?: string | null;
  id?: string | null;
  title?: string | null;
  category?: string | null;
}

const LEGACY_GENERIC_DEFAULTS = new Set([
  "#6366f1",
  "#4f46e5",
  "#1f2937",
  "#0a0a0a",
  "#000000",
]);

/**
 * Resolves a visually rich and distinctive cover color for an ebook.
 * Preserves custom user colors, but upgrades monotone legacy defaults
 * to curated editorial shades deterministically by topic, id, or title.
 */
export function resolveBookCoverColor(params: ResolveBookCoverColorParams = {}): string {
  const { coverColor, id, title, category } = params;

  // If user explicitly provided a non-default custom color, respect it
  if (coverColor) {
    const norm = coverColor.trim().toLowerCase();
    if (!LEGACY_GENERIC_DEFAULTS.has(norm)) {
      return coverColor;
    }
  }

  // Choose pool based on semantic topic/niche/title
  let pool: readonly string[] = EDITORIAL_BOOK_PALETTE;
  const c = (category || "").toLowerCase();
  const t = (title || "").toLowerCase();

  if (
    c.includes("uang") ||
    c.includes("finance") ||
    c.includes("bisnis") ||
    c.includes("invest") ||
    t.includes("keuangan") ||
    t.includes("finansial") ||
    t.includes("bisnis")
  ) {
    pool = CATEGORY_PALETTES.finance;
  } else if (
    c.includes("market") ||
    c.includes("growth") ||
    c.includes("sales") ||
    c.includes("jual") ||
    t.includes("market") ||
    t.includes("iklan")
  ) {
    pool = CATEGORY_PALETTES.marketing;
  } else if (
    c.includes("ai") ||
    c.includes("tech") ||
    c.includes("product") ||
    c.includes("code") ||
    c.includes("data") ||
    t.includes(" ai") ||
    t.startsWith("ai ") ||
    t.includes("teknologi")
  ) {
    pool = CATEGORY_PALETTES.tech;
  } else if (
    c.includes("kreatif") ||
    c.includes("desain") ||
    c.includes("design") ||
    c.includes("art") ||
    c.includes("brand")
  ) {
    pool = CATEGORY_PALETTES.creative;
  }

  const seed = `${id ?? ""}-${title ?? ""}-${category ?? ""}`;
  if (!seed.replace(/-/g, "").trim()) {
    return pool[0];
  }

  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash << 5) - hash + seed.charCodeAt(i);
    hash |= 0;
  }
  const index = Math.abs(hash) % pool.length;
  return pool[index];
}

/**
 * Calculates WCAG relative luminance of a hex color.
 */
export function getRelativeLuminance(hexColor: string): number {
  const clean = hexColor.replace("#", "").trim();
  if (clean.length !== 6 && clean.length !== 3) {
    return 0.1; // fallback to dark
  }
  const full =
    clean.length === 3
      ? clean
          .split("")
          .map((c) => c + c)
          .join("")
      : clean;

  const r = parseInt(full.substring(0, 2), 16) / 255;
  const g = parseInt(full.substring(2, 4), 16) / 255;
  const b = parseInt(full.substring(4, 6), 16) / 255;

  const toLinear = (val: number) =>
    val <= 0.03928 ? val / 12.92 : Math.pow((val + 0.055) / 1.055, 2.4);

  return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
}

export function isDarkColor(hexColor: string): boolean {
  return getRelativeLuminance(hexColor) <= 0.45;
}

export function getContrastTextColor(hexColor: string): "#FFFFFF" | "#0F172A" {
  return isDarkColor(hexColor) ? "#FFFFFF" : "#0F172A";
}

