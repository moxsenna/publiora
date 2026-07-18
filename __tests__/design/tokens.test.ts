import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const css = readFileSync(resolve(process.cwd(), "app/globals.css"), "utf8");
const designMd = readFileSync(resolve(process.cwd(), "docs/stitch/DESIGN.md"), "utf8");

function token(name: string, hex: string) {
  it(`defines ${name} = ${hex}`, () => {
    expect(css).toMatch(new RegExp(`${name}:\\s*${hex}`, "i"));
    expect(designMd.toLowerCase()).toContain(hex.toLowerCase());
  });
}

describe("Publiora hard-lock design tokens", () => {
  token("--color-publiora-black", "#0A0A0A");
  token("--color-publiora-white", "#FAFAF8");
  token("--color-publiora-border", "#E5E5E5");
  token("--color-publiora-blue", "#2563EB");
  token("--color-publiora-emerald", "#059669");
  token("--color-gold", "#C8A24B");
  token("--color-gold-soft", "#E9D9A8");
  token("--color-deep-gray", "#171717");

  it("locks radius tokens", () => {
    // Density-tight radii from feat/full-mvp-backend merge
    expect(css).toMatch(/--radius-card:\s*16px/);
    expect(css).toMatch(/--radius-button:\s*10px/);
    expect(css).toMatch(/--radius-input:\s*10px/);
    expect(css).toMatch(/--radius-pill:\s*9999px/);
  });

  it("locks font families to Plus Jakarta + Inter variables", () => {
    expect(css).toMatch(/--font-heading:\s*var\(--font-plus-jakarta-sans\)/);
    expect(css).toMatch(/--font-body:\s*var\(--font-inter\)/);
  });
});
