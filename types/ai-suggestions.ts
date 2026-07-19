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

/** Client request to generate structured CTAs. */
export interface CtaGenerateRequest {
  goal: CtaGoal;
  destination_url: string | null;
  placement: "ebook_end" | "claim_page" | "both";
  custom_instruction: string | null;
}

/** Server response with multiple differentiated suggestions. */
export interface CtaGenerateResponse {
  suggestions: CtaSuggestion[];
}

/**
 * Basic URL validation for CTA destinations.
 * Returns true for valid http/https URLs; also allows null for goals that
 * do not require a URL (e.g. "custom").
 */
export function isValidCtaUrl(url: string | null): boolean {
  if (url === null) return true;
  if (typeof url !== "string" || url.trim().length === 0) return false;
  try {
    const parsed = new URL(url.trim());
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}
