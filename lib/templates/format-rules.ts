// Pure format metadata presets (no catalog imports).

import type {
  FormatQualityRules,
  SectionRange,
  TemplateDepth,
  TemplateFormat,
} from "@/types/template";

export const DEPTH_TARGET_WORDS: Record<TemplateDepth, number> = {
  quick: 400,
  standard: 700,
  deep: 1000,
};

export const FORMAT_QUALITY_PRESETS: Record<
  TemplateFormat,
  FormatQualityRules
> = {
  blank: {
    requires_action_steps: false,
    requires_checklist_items: false,
    requires_reflection_prompts: false,
    requires_framework_components: false,
    requires_phase_structure: false,
    theory_ratio_max: null,
  },
  quick_win_guide: {
    requires_action_steps: true,
    requires_checklist_items: false,
    requires_reflection_prompts: false,
    requires_framework_components: false,
    requires_phase_structure: false,
    theory_ratio_max: 0.35,
  },
  checklist: {
    requires_action_steps: true,
    requires_checklist_items: true,
    requires_reflection_prompts: false,
    requires_framework_components: false,
    requires_phase_structure: false,
    theory_ratio_max: 0.3,
  },
  playbook: {
    requires_action_steps: true,
    requires_checklist_items: false,
    requires_reflection_prompts: false,
    requires_framework_components: false,
    requires_phase_structure: true,
    theory_ratio_max: 0.4,
  },
  framework: {
    requires_action_steps: false,
    requires_checklist_items: false,
    requires_reflection_prompts: false,
    requires_framework_components: true,
    requires_phase_structure: false,
    theory_ratio_max: 0.45,
  },
  workbook: {
    requires_action_steps: true,
    requires_checklist_items: false,
    requires_reflection_prompts: true,
    requires_framework_components: false,
    requires_phase_structure: false,
    theory_ratio_max: 0.35,
  },
  implementation_guide: {
    requires_action_steps: true,
    requires_checklist_items: false,
    requires_reflection_prompts: false,
    requires_framework_components: false,
    requires_phase_structure: true,
    theory_ratio_max: 0.35,
  },
  resource_guide: {
    requires_action_steps: true,
    requires_checklist_items: true,
    requires_reflection_prompts: false,
    requires_framework_components: false,
    requires_phase_structure: false,
    theory_ratio_max: 0.25,
  },
  workshop: {
    requires_action_steps: true,
    requires_checklist_items: false,
    requires_reflection_prompts: true,
    requires_framework_components: false,
    requires_phase_structure: true,
    theory_ratio_max: 0.4,
  },
};

export const FORMAT_STRUCTURAL_RULES: Record<TemplateFormat, string[]> = {
  blank: [
    "Structure content clearly for the chosen ebook type.",
    "Prefer practical, scannable sections over long theory.",
    "Each section must have a clear reader outcome.",
  ],
  quick_win_guide: [
    "Deliver one narrowly defined result.",
    "Reader should act within 15–45 minutes.",
    "Avoid broad foundational chapters.",
    "Include immediate action steps.",
  ],
  checklist: [
    "Most sections must contain actionable checklist items.",
    "One clear action per item.",
    "Minimal long-form theory.",
    "Final section contains an implementation checklist.",
    "Prefer scannable headings and short paragraphs.",
  ],
  playbook: [
    "Organize content into phases.",
    "Each phase contains objective, actions, and expected output.",
    "Include sequencing and decision guidance.",
  ],
  framework: [
    "Define named components.",
    "Explain relationships among components.",
    "Include decision criteria.",
    "Include at least one complete worked example.",
  ],
  workbook: [
    "Include reflection or decision prompts.",
    "Include fillable exercises.",
    "Each section produces a user-created output.",
  ],
  implementation_guide: [
    "Anchor content to the parent Offer.",
    "Explain when and how to use the guide.",
    "Include prerequisites, steps, verification, and troubleshooting.",
  ],
  resource_guide: [
    "Curate ready-to-use assets and references.",
    "Explain when to use each resource.",
    "Keep descriptions short and utility-focused.",
  ],
  workshop: [
    "Organize into session/sprint style modules.",
    "Each module has practice work and outputs.",
    "Include facilitation or self-paced instructions.",
  ],
};

export const FORMAT_SECTION_EXPECTATIONS: Record<TemplateFormat, string[]> = {
  blank: [
    "Clear heading and purpose.",
    "Actionable guidance the reader can apply.",
  ],
  quick_win_guide: [
    "State the quick win outcome up front.",
    "Provide step-by-step actions with timeboxing.",
    "End with a verification checklist for the result.",
  ],
  checklist: [
    "Lead with scannable checklist items.",
    "Keep items atomic and actionable.",
    "Add brief notes only when needed for clarity.",
  ],
  playbook: [
    "Open with phase objective.",
    "List ordered actions and decision points.",
    "Define expected outputs for the phase.",
  ],
  framework: [
    "Name and define each component.",
    "Show how components relate.",
    "Include a worked example applying the framework.",
  ],
  workbook: [
    "Include at least one exercise or prompt.",
    "Leave space for reader answers or decisions.",
    "State the output the reader should produce.",
  ],
  implementation_guide: [
    "List prerequisites before steps.",
    "Provide ordered implementation steps.",
    "Include verification and troubleshooting notes.",
  ],
  resource_guide: [
    "Catalog resources with purpose tags.",
    "Explain usage conditions briefly.",
  ],
  workshop: [
    "Define session goal and materials.",
    "Include practice activities and debrief prompts.",
  ],
};

export function baseSectionRangeForFormat(
  format: TemplateFormat,
): SectionRange {
  switch (format) {
    case "quick_win_guide":
      return { min: 3, preferred: 5, max: 6 };
    case "checklist":
      return { min: 4, preferred: 6, max: 9 };
    case "playbook":
      return { min: 5, preferred: 8, max: 12 };
    case "framework":
      return { min: 4, preferred: 7, max: 12 };
    case "workbook":
      return { min: 4, preferred: 6, max: 9 };
    case "implementation_guide":
      return { min: 4, preferred: 6, max: 8 };
    case "resource_guide":
      return { min: 3, preferred: 5, max: 8 };
    case "workshop":
      return { min: 6, preferred: 8, max: 12 };
    case "blank":
    default:
      return { min: 4, preferred: 6, max: 8 };
  }
}

export function defaultTargetWordsForDepth(depth: TemplateDepth): number {
  return DEPTH_TARGET_WORDS[depth];
}

export function targetWordsRangeFor(defaultTargetWords: number): {
  min: number;
  max: number;
} {
  return {
    min: Math.max(150, Math.round(defaultTargetWords * 0.7)),
    max: Math.round(defaultTargetWords * 1.4),
  };
}
