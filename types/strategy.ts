// Project strategy — AI-guided ebook planning domain.

export const PROJECT_STATE_SCHEMA_VERSION = 2 as const;

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
}

/** The set of required strategy fields that must be non-empty for readiness. */
export const REQUIRED_STRATEGY_FIELDS: (keyof EbookStrategy)[] = [
  "topic",
  "audience",
  "primary_problem",
  "desired_outcome",
  "core_promise",
  "unique_angle",
];

export interface ProjectStateV2 {
  schema_version: typeof PROJECT_STATE_SCHEMA_VERSION;
  strategy: EbookStrategy;
  missing_fields: string[];
  next_action: StrategyNextAction;
  conversation_summary: string | null;
  updated_at: string;
}

export interface StrategistResult {
  assistant_message: string;
  state_patch: Partial<EbookStrategy>;
  readiness_score: number;
  missing_fields: string[];
  next_action: StrategyNextAction;
  conversation_summary?: string;
}
