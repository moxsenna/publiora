import { describe, expect, it } from "vitest";
import { SYSTEM_TEMPLATES, getTemplateById } from "@/lib/templates-catalog";
import {
  resolveFormatContext,
  resolveSectionRange,
} from "@/lib/templates/format-context";
import type { EbookType } from "@/types/project";
import type { TemplateFormat } from "@/types/template";

const KNOWN_IDS = [
  "tpl_quick_win",
  "tpl_checklist",
  "tpl_playbook",
  "tpl_framework",
  "tpl_workbook",
  "tpl_implementation_guide",
  "tpl_resource_guide",
  "tpl_workshop",
  "tpl_blank",
] as const;

describe("format-context", () => {
  it("keeps all known system template IDs", () => {
    for (const id of KNOWN_IDS) {
      expect(getTemplateById(id)?.id).toBe(id);
    }
    expect(SYSTEM_TEMPLATES.map((t) => t.id).sort()).toEqual(
      [...KNOWN_IDS].sort(),
    );
  });

  it("gives every system template full generation metadata", () => {
    for (const tpl of SYSTEM_TEMPLATES) {
      expect(tpl.section_range.min).toBeGreaterThan(0);
      expect(tpl.section_range.preferred).toBeGreaterThanOrEqual(
        tpl.section_range.min,
      );
      expect(tpl.section_range.max).toBeGreaterThanOrEqual(
        tpl.section_range.preferred,
      );
      expect(tpl.default_target_words).toBeGreaterThan(0);
      expect(tpl.structural_rules.length).toBeGreaterThan(0);
      expect(tpl.section_output_expectations.length).toBeGreaterThan(0);
      expect(tpl.quality_rules).toMatchObject({
        requires_action_steps: expect.any(Boolean),
        requires_checklist_items: expect.any(Boolean),
        requires_reflection_prompts: expect.any(Boolean),
        requires_framework_components: expect.any(Boolean),
        requires_phase_structure: expect.any(Boolean),
      });
    }
  });

  it("centralizes section ranges for the type/format matrix", () => {
    const cases: Array<{
      ebookType: EbookType;
      format: TemplateFormat;
      min: number;
      preferred: number;
      max: number;
    }> = [
      {
        ebookType: "lead_magnet",
        format: "quick_win_guide",
        min: 3,
        preferred: 5,
        max: 6,
      },
      {
        ebookType: "lead_magnet",
        format: "checklist",
        min: 4,
        preferred: 6,
        max: 9,
      },
      {
        ebookType: "lead_magnet",
        format: "playbook",
        min: 5,
        preferred: 6,
        max: 8,
      },
      {
        ebookType: "lead_magnet",
        format: "framework",
        min: 4,
        preferred: 6,
        max: 8,
      },
      {
        ebookType: "bonus_product",
        format: "checklist",
        min: 3,
        preferred: 5,
        max: 8,
      },
      {
        ebookType: "bonus_product",
        format: "implementation_guide",
        min: 4,
        preferred: 6,
        max: 8,
      },
      {
        ebookType: "bonus_product",
        format: "workbook",
        min: 4,
        preferred: 6,
        max: 9,
      },
      {
        ebookType: "sellable_ebook",
        format: "playbook",
        min: 6,
        preferred: 8,
        max: 12,
      },
      {
        ebookType: "sellable_ebook",
        format: "framework",
        min: 6,
        preferred: 8,
        max: 12,
      },
      {
        ebookType: "sellable_ebook",
        format: "workbook",
        min: 6,
        preferred: 9,
        max: 12,
      },
      {
        ebookType: "sellable_ebook",
        format: "workshop",
        min: 6,
        preferred: 8,
        max: 12,
      },
    ];

    for (const c of cases) {
      expect(
        resolveSectionRange({ ebookType: c.ebookType, format: c.format }),
      ).toEqual({ min: c.min, preferred: c.preferred, max: c.max });
    }
  });

  it("falls back by ebook type when format has no matrix entry", () => {
    expect(
      resolveSectionRange({ ebookType: "lead_magnet", format: "blank" }),
    ).toEqual({ min: 4, preferred: 6, max: 8 });
    expect(
      resolveSectionRange({ ebookType: "bonus_product", format: "blank" }),
    ).toEqual({ min: 3, preferred: 5, max: 8 });
    expect(
      resolveSectionRange({ ebookType: "sellable_ebook", format: "blank" }),
    ).toEqual({ min: 6, preferred: 8, max: 12 });
  });

  it("resolves blank/missing template by ebook type", () => {
    const missing = resolveFormatContext({
      ebookType: "lead_magnet",
      templateId: null,
    });
    expect(missing.template_id).toBeNull();
    expect(missing.format).toBe("blank");
    expect(missing.section_range).toEqual({ min: 4, preferred: 6, max: 8 });
    expect(missing.default_target_words).toBe(700);
    expect(missing.structural_rules.length).toBeGreaterThan(0);

    const blankTpl = resolveFormatContext({
      ebookType: "sellable_ebook",
      templateId: "tpl_blank",
    });
    expect(blankTpl.template_id).toBe("tpl_blank");
    expect(blankTpl.format).toBe("blank");
    expect(blankTpl.section_range).toEqual({ min: 6, preferred: 8, max: 12 });
  });

  it("resolves selected template format into FormatContext", () => {
    const checklist = resolveFormatContext({
      ebookType: "lead_magnet",
      templateId: "tpl_checklist",
    });
    expect(checklist.template_id).toBe("tpl_checklist");
    expect(checklist.format).toBe("checklist");
    expect(checklist.quality_rules.requires_checklist_items).toBe(true);
    expect(checklist.section_range).toEqual({ min: 4, preferred: 6, max: 9 });
    expect(
      checklist.structural_rules.some((r) => /checklist/i.test(r)),
    ).toBe(true);

    const workbook = resolveFormatContext({
      ebookType: "bonus_product",
      templateId: "tpl_workbook",
    });
    expect(workbook.format).toBe("workbook");
    expect(workbook.quality_rules.requires_reflection_prompts).toBe(true);
    expect(workbook.section_range).toEqual({ min: 4, preferred: 6, max: 9 });
  });

  it("includes target word range around the default", () => {
    const ctx = resolveFormatContext({
      ebookType: "lead_magnet",
      templateId: "tpl_quick_win",
    });
    expect(ctx.default_target_words).toBe(400);
    expect(ctx.target_words_range.min).toBeLessThan(ctx.default_target_words);
    expect(ctx.target_words_range.max).toBeGreaterThan(
      ctx.default_target_words,
    );
  });
});
