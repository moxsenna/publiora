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
}

export interface TemplateList {
  system: Template[];
  user: Template[];
}
