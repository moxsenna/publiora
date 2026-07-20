import { describe, expect, it } from "vitest";
import {
  BONUS_ROLE_LABELS,
  EBOOK_TYPE_DESCRIPTIONS,
  EBOOK_TYPE_LABELS,
  LEAD_GOAL_LABELS,
  SALES_POSITIONING_LABELS,
  ebookTypeLabel,
} from "@/lib/projects/project-type-copy";
import {
  BONUS_ROLES,
  LEAD_GOALS,
  SALES_POSITIONINGS,
  type EbookType,
} from "@/types/project";

const EBOOK_TYPES: EbookType[] = [
  "lead_magnet",
  "bonus_product",
  "sellable_ebook",
];

describe("project-type-copy", () => {
  it("returns label and description for every ebook type", () => {
    for (const t of EBOOK_TYPES) {
      expect(EBOOK_TYPE_LABELS[t].length).toBeGreaterThan(0);
      expect(EBOOK_TYPE_DESCRIPTIONS[t].length).toBeGreaterThan(0);
      expect(ebookTypeLabel(t)).toBe(EBOOK_TYPE_LABELS[t]);
    }
  });

  it("uses Indonesian labels for Bonus and Sellable", () => {
    expect(EBOOK_TYPE_LABELS.bonus_product).toBe("Bonus Pembelian");
    expect(EBOOK_TYPE_LABELS.sellable_ebook).toBe("Ebook Berbayar");
  });

  it("covers all lead goals", () => {
    for (const g of LEAD_GOALS) {
      expect(LEAD_GOAL_LABELS[g]).toBeTruthy();
    }
  });

  it("covers all bonus roles", () => {
    for (const r of BONUS_ROLES) {
      expect(BONUS_ROLE_LABELS[r]).toBeTruthy();
    }
  });

  it("covers all sales positionings", () => {
    for (const p of SALES_POSITIONINGS) {
      expect(SALES_POSITIONING_LABELS[p]).toBeTruthy();
    }
  });
});
