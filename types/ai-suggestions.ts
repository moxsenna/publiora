// AI content enhancement and CTA suggestion contracts.

export type EnhancementAction =
  | "expand"
  | "shorten"
  | "simplify"
  | "persuasive"
  | "professional"
  | "add_examples"
  | "add_checklist";

export interface EnhancementSuggestion {
  action: EnhancementAction;
  original_html: string;
  suggested_html: string;
  summary: string;
  original_word_count: number;
  suggested_word_count: number;
}

export type TitleStyle =
  | "curiosity"
  | "authority"
  | "practical"
  | "contrarian"
  | "outcome";

export interface TitleSuggestion {
  style: TitleStyle;
  title: string;
  rationale: string;
}

export type CtaGoal =
  | "visit_product"
  | "join_whatsapp"
  | "claim_bonus"
  | "buy_product"
  | "follow_creator"
  | "custom";

/** CTA goals that require a valid URL. */
export const CTA_URL_REQUIRED_GOALS: CtaGoal[] = [
  "visit_product",
  "join_whatsapp",
  "claim_bonus",
  "buy_product",
  "follow_creator",
];

export interface CtaSuggestion {
  goal: CtaGoal;
  text: string;
  placement: "ebook_end" | "claim_page" | "both";
  rationale: string;
}
