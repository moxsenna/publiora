// Shared format resolver for Planner/Writer generation contracts.

import type { EbookType } from "@/types/project";
import type {
  FormatContext,
  SectionRange,
  Template,
  TemplateFormat,
} from "@/types/template";
import { getTemplateById as catalogGetTemplateById } from "@/lib/templates-catalog";
import {
  DEPTH_TARGET_WORDS,
  FORMAT_QUALITY_PRESETS,
  FORMAT_SECTION_EXPECTATIONS,
  FORMAT_STRUCTURAL_RULES,
  targetWordsRangeFor,
} from "@/lib/templates/format-rules";

export {
  FORMAT_QUALITY_PRESETS,
  FORMAT_SECTION_EXPECTATIONS,
  FORMAT_STRUCTURAL_RULES,
  baseSectionRangeForFormat,
  defaultTargetWordsForDepth,
  targetWordsRangeFor,
} from "@/lib/templates/format-rules";

export function getTemplateById(
  templateId: string | null | undefined,
): Template | null {
  return catalogGetTemplateById(templateId);
}

/** Fallback section range when template is blank/missing. */
const TYPE_FALLBACK_RANGE: Record<EbookType, SectionRange> = {
  lead_magnet: { min: 4, preferred: 6, max: 8 },
  bonus_product: { min: 3, preferred: 5, max: 8 },
  sellable_ebook: { min: 6, preferred: 8, max: 12 },
};

/**
 * Explicit type+format matrix. Keys: `${ebookType}:${format}`.
 * Unlisted combos fall back to type defaults.
 */
const TYPE_FORMAT_RANGE: Partial<Record<string, SectionRange>> = {
  "lead_magnet:quick_win_guide": { min: 3, preferred: 5, max: 6 },
  "lead_magnet:checklist": { min: 4, preferred: 6, max: 9 },
  "lead_magnet:playbook": { min: 5, preferred: 6, max: 8 },
  "lead_magnet:framework": { min: 4, preferred: 6, max: 8 },
  "bonus_product:checklist": { min: 3, preferred: 5, max: 8 },
  "bonus_product:implementation_guide": { min: 4, preferred: 6, max: 8 },
  "bonus_product:workbook": { min: 4, preferred: 6, max: 9 },
  "sellable_ebook:playbook": { min: 6, preferred: 8, max: 12 },
  "sellable_ebook:framework": { min: 6, preferred: 8, max: 12 },
  "sellable_ebook:workbook": { min: 6, preferred: 9, max: 12 },
  "sellable_ebook:workshop": { min: 6, preferred: 8, max: 12 },
};

export function resolveSectionRange(input: {
  ebookType: EbookType;
  format: TemplateFormat;
}): SectionRange {
  const key = `${input.ebookType}:${input.format}`;
  return (
    TYPE_FORMAT_RANGE[key] ??
    TYPE_FALLBACK_RANGE[input.ebookType] ?? {
      min: 4,
      preferred: 6,
      max: 8,
    }
  );
}

function blankFormatContext(ebookType: EbookType): FormatContext {
  const section_range = resolveSectionRange({
    ebookType,
    format: "blank",
  });
  const default_target_words = DEPTH_TARGET_WORDS.standard;
  return {
    template_id: null,
    format: "blank",
    depth: "standard",
    section_range,
    default_target_words,
    target_words_range: targetWordsRangeFor(default_target_words),
    structural_rules: [...FORMAT_STRUCTURAL_RULES.blank],
    section_output_expectations: [...FORMAT_SECTION_EXPECTATIONS.blank],
    quality_rules: { ...FORMAT_QUALITY_PRESETS.blank },
  };
}

export function resolveFormatContext(input: {
  ebookType: EbookType;
  templateId: string | null;
}): FormatContext {
  const template = getTemplateById(input.templateId);

  if (!template || template.format === "blank") {
    const blank = blankFormatContext(input.ebookType);
    if (template?.format === "blank") {
      return {
        ...blank,
        template_id: template.id,
        section_range: resolveSectionRange({
          ebookType: input.ebookType,
          format: "blank",
        }),
      };
    }
    return blank;
  }

  const section_range = resolveSectionRange({
    ebookType: input.ebookType,
    format: template.format,
  });

  const default_target_words =
    template.default_target_words || DEPTH_TARGET_WORDS[template.depth];

  return {
    template_id: template.id,
    format: template.format,
    depth: template.depth,
    section_range,
    default_target_words,
    target_words_range: targetWordsRangeFor(default_target_words),
    structural_rules: [...template.structural_rules],
    section_output_expectations: [...template.section_output_expectations],
    quality_rules: { ...template.quality_rules },
  };
}
