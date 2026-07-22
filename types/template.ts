// Template — presets for project generation.

import type { EbookType } from "@/types/project";

export type TemplateFormat =
  | "blank"
  | "quick_win_guide"
  | "playbook"
  | "checklist"
  | "framework"
  | "workbook"
  | "implementation_guide"
  | "resource_guide"
  | "workshop";

export type TemplateDepth = "quick" | "standard" | "deep";

export interface SectionRange {
  min: number;
  preferred: number;
  max: number;
}

export interface FormatQualityRules {
  requires_action_steps: boolean;
  requires_checklist_items: boolean;
  requires_reflection_prompts: boolean;
  requires_framework_components: boolean;
  requires_phase_structure: boolean;
  theory_ratio_max: number | null;
}

export interface FormatContext {
  template_id: string | null;
  format: TemplateFormat;
  depth: TemplateDepth;

  section_range: SectionRange;
  default_target_words: number;
  target_words_range: {
    min: number;
    max: number;
  };

  structural_rules: string[];
  section_output_expectations: string[];
  quality_rules: FormatQualityRules;
}

export interface Template {
  id: string;
  name: string;
  description: string;
  niche: string;
  default_audience: string;
  default_tone: string;
  cover_color: string;
  is_system: boolean;

  format: TemplateFormat;
  supported_ebook_types: EbookType[];
  recommended_for: string[];
  default_section_count: number;
  depth: TemplateDepth;

  section_range: SectionRange;
  default_target_words: number;
  structural_rules: string[];
  section_output_expectations: string[];
  quality_rules: FormatQualityRules;
}

export interface TemplateList {
  system: Template[];
  user: Template[];
}
