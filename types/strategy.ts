// Project strategy — AI-guided ebook planning domain.

import type { EbookType } from "@/types/project";

export const PROJECT_STATE_SCHEMA_VERSION = 3 as const;

export type StrategyNextAction =
  | "continue_strategy"
  | "create_outline"
  | "review_outline"
  | "start_writing";

export interface EbookStrategy {
  topic: string | null;
  audience: string | null;
  audience_sophistication: string | null;
  primary_problem: string | null;
  pain_points: string[];
  desired_outcome: string | null;
  core_promise: string | null;
  unique_angle: string | null;
  content_pillars: string[];
  product_or_offer: string | null;
  funnel_goal: string | null;
  cta_goal: string | null;
  tone: string | null;
  // V3 type-specific context
  traffic_source: string | null;
  bonus_role: string | null;
  usage_moment: string | null;
  sales_positioning: string | null;
  buyer_objections: string[];
}

/** Base required strategy fields for all ebook types. */
export const BASE_REQUIRED_STRATEGY_FIELDS: (keyof EbookStrategy)[] = [
  "topic",
  "audience",
  "primary_problem",
  "desired_outcome",
  "core_promise",
  "unique_angle",
];

/**
 * @deprecated Prefer getRequiredStrategyFields(ebookType).
 * Kept for callers that have not yet adopted type-aware readiness.
 */
export const REQUIRED_STRATEGY_FIELDS = BASE_REQUIRED_STRATEGY_FIELDS;

export function getRequiredStrategyFields(
  ebookType: EbookType,
): (keyof EbookStrategy)[] {
  const base = [...BASE_REQUIRED_STRATEGY_FIELDS];
  switch (ebookType) {
    case "lead_magnet":
      return [...base, "funnel_goal"];
    case "bonus_product":
      return [...base, "product_or_offer", "bonus_role", "usage_moment"];
    case "sellable_ebook":
      return [...base, "sales_positioning"];
    default:
      return base;
  }
}

export interface ProjectStateV3 {
  schema_version: typeof PROJECT_STATE_SCHEMA_VERSION;
  strategy: EbookStrategy;
  missing_fields: string[];
  next_action: StrategyNextAction;
  conversation_summary: string | null;
  updated_at: string;
}

/** @deprecated Alias for ProjectStateV3 during migration. */
export type ProjectStateV2 = ProjectStateV3;

export type StrategySuggestedReplyIntent =
  | "answer"
  | "ask_recommendation"
  | "confirm"
  | "clarify";

export interface StrategySuggestedReply {
  label: string;
  message: string;
  field?: keyof EbookStrategy | null;
  intent: StrategySuggestedReplyIntent;
}

export interface StrategistResult {
  assistant_message: string;
  state_patch: Partial<EbookStrategy>;
  readiness_score: number;
  missing_fields: string[];
  next_action: StrategyNextAction;
  conversation_summary?: string;
  suggested_replies: StrategySuggestedReply[];
  response_language: "id" | "en";
}
