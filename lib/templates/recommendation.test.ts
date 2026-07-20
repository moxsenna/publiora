import { describe, expect, it } from "vitest";
import { rankTemplates } from "@/lib/templates/recommendation";

describe("rankTemplates", () => {
  it("ranks checklist/quick win high for lead quick-win context", () => {
    const ranked = rankTemplates({
      ebookType: "lead_magnet",
      leadGoal: "collect_email",
      desiredOutcome: "Quick win dalam 30 menit",
      primaryProblem: "Butuh hasil cepat",
    });
    const top = ranked.filter((r) => r.recommended).map((r) => r.template.format);
    expect(
      top.includes("checklist") || top.includes("quick_win_guide"),
    ).toBe(true);
    expect(ranked.some((r) => r.template.format === "blank")).toBe(true);
  });

  it("ranks playbook/framework for lead complex system", () => {
    const ranked = rankTemplates({
      ebookType: "lead_magnet",
      desiredOutcome: "Membangun sistem lead generation end-to-end",
      primaryProblem: "Belum punya framework yang mendalam",
    });
    const topFormats = ranked.slice(0, 3).map((r) => r.template.format);
    expect(
      topFormats.includes("playbook") || topFormats.includes("framework"),
    ).toBe(true);
  });

  it("ranks implementation guide for bonus implementation", () => {
    const ranked = rankTemplates({
      ebookType: "bonus_product",
      bonusRole: "implementation_aid",
      desiredOutcome: "Bisa menerapkan produk utama",
      primaryProblem: "Bingung mulai",
    });
    expect(ranked[0]?.template.format).toBe("implementation_guide");
    expect(ranked[0]?.recommended).toBe(true);
  });

  it("ranks workbook/checklist/resource for ready-to-use assets", () => {
    const ranked = rankTemplates({
      ebookType: "bonus_product",
      bonusRole: "ready_to_use_assets",
      desiredOutcome: "Template siap pakai",
      primaryProblem: "Tidak punya aset",
    });
    const top = ranked.slice(0, 3).map((r) => r.template.format);
    expect(
      top.some((f) =>
        ["workbook", "checklist", "resource_guide"].includes(f),
      ),
    ).toBe(true);
  });

  it("ranks playbook/framework for sellable premium", () => {
    const ranked = rankTemplates({
      ebookType: "sellable_ebook",
      salesPositioning: "premium_authority",
      desiredOutcome: "Panduan premium mendalam",
      primaryProblem: "Butuh diferensiasi",
    });
    const top = ranked.slice(0, 2).map((r) => r.template.format);
    expect(
      top.includes("playbook") || top.includes("framework"),
    ).toBe(true);
  });

  it("keeps stable ordering on ties via template id", () => {
    const a = rankTemplates({
      ebookType: "lead_magnet",
      desiredOutcome: "Hasil",
      primaryProblem: "Masalah",
    });
    const b = rankTemplates({
      ebookType: "lead_magnet",
      desiredOutcome: "Hasil",
      primaryProblem: "Masalah",
    });
    expect(a.map((r) => r.template.id)).toEqual(b.map((r) => r.template.id));
  });

  it("only returns templates supporting ebook type", () => {
    const ranked = rankTemplates({
      ebookType: "sellable_ebook",
      desiredOutcome: "x",
      primaryProblem: "y",
    });
    for (const r of ranked) {
      expect(r.template.supported_ebook_types).toContain("sellable_ebook");
    }
  });
});
