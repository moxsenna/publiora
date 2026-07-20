// Project state normalization — V3 schema migration, safe merge, and missing-field calculation.

import type { EbookType } from "@/types/project";
import {
  type EbookStrategy,
  type ProjectStateV3,
  type StrategistResult,
  PROJECT_STATE_SCHEMA_VERSION,
  getRequiredStrategyFields,
  BASE_REQUIRED_STRATEGY_FIELDS,
} from "@/types/strategy";

/** @deprecated Use ProjectStateV3 */
export type ProjectStateV2 = ProjectStateV3;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Trim whitespace; treat the empty string as null. */
function cleanString(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const t = v.trim();
  return t.length > 0 ? t : null;
}

/** Normalise an array: filter out blanks, trim, deduplicate. */
function cleanStringArray(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const item of v) {
    const s = typeof item === "string" ? item.trim() : "";
    if (s.length === 0) continue;
    if (seen.has(s)) continue;
    seen.add(s);
    out.push(s);
  }
  return out;
}

/** Clamp a number between min and max. */
function clamp(v: number, min: number, max: number): number {
  if (!Number.isFinite(v)) return min;
  return Math.max(min, Math.min(max, v));
}

/** Clamp readiness score to 0..100. Non-finite / non-number → 0. */
export function clampReadinessScore(score: unknown): number {
  if (typeof score !== "number" || !Number.isFinite(score)) return 0;
  return clamp(score, 0, 100);
}

/** Check if value is a plain non-null object (not an array). */
function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function isEbookType(v: unknown): v is EbookType {
  return (
    v === "lead_magnet" || v === "bonus_product" || v === "sellable_ebook"
  );
}

// ---------------------------------------------------------------------------
// Strategy field keys – all known keys of EbookStrategy
// ---------------------------------------------------------------------------

const STRATEGY_SCALAR_KEYS: (keyof EbookStrategy)[] = [
  "topic",
  "audience",
  "audience_sophistication",
  "primary_problem",
  "desired_outcome",
  "core_promise",
  "unique_angle",
  "product_or_offer",
  "funnel_goal",
  "cta_goal",
  "tone",
  "traffic_source",
  "bonus_role",
  "usage_moment",
  "sales_positioning",
];

const STRATEGY_ARRAY_KEYS: (keyof EbookStrategy)[] = [
  "pain_points",
  "content_pillars",
  "buyer_objections",
];

function emptyStrategy(): EbookStrategy {
  return {
    topic: null,
    audience: null,
    audience_sophistication: null,
    primary_problem: null,
    pain_points: [],
    desired_outcome: null,
    core_promise: null,
    unique_angle: null,
    content_pillars: [],
    product_or_offer: null,
    funnel_goal: null,
    cta_goal: null,
    tone: null,
    traffic_source: null,
    bonus_role: null,
    usage_moment: null,
    sales_positioning: null,
    buyer_objections: [],
  };
}

// ---------------------------------------------------------------------------
// createEmptyProjectState
// ---------------------------------------------------------------------------

export function createEmptyProjectState(
  ebookType: EbookType = "lead_magnet",
): ProjectStateV3 {
  const strategy = emptyStrategy();
  return {
    schema_version: PROJECT_STATE_SCHEMA_VERSION,
    strategy,
    missing_fields: computeMissingFields(strategy, ebookType),
    next_action: "continue_strategy",
    conversation_summary: null,
    updated_at: new Date().toISOString(),
  };
}

// ---------------------------------------------------------------------------
// normalizeProjectState
// ---------------------------------------------------------------------------

/**
 * Convert any raw persisted value into a valid `ProjectStateV3`.
 *
 * - Legacy top-level strategy fields are nested under `strategy`.
 * - Unknown keys are dropped.
 * - `schema_version` is forced to 3.
 * - V2 states gain empty defaults for new V3 fields.
 * - `updated_at` is not trusted; regenerated server-side.
 */
export function normalizeProjectState(
  raw: unknown,
  ebookType: EbookType = "lead_magnet",
): ProjectStateV3 {
  const type = isEbookType(ebookType) ? ebookType : "lead_magnet";
  const base = createEmptyProjectState(type);

  if (!isRecord(raw)) return base;

  const src = raw as Record<string, unknown>;
  const strategy = normalizeStrategy(src);
  const missing_fields = computeMissingFields(strategy, type);

  base.strategy = strategy;
  base.missing_fields = missing_fields;
  base.next_action = normalizeNextAction(
    cleanString(src.next_action),
    missing_fields,
  );
  base.conversation_summary = cleanString(src.conversation_summary);
  base.updated_at = new Date().toISOString();

  return base;
}

// ---------------------------------------------------------------------------
// mergeProjectState
// ---------------------------------------------------------------------------

/**
 * Merge an AI `StrategistResult` into the current project state.
 */
export function mergeProjectState(
  current: ProjectStateV3,
  result: StrategistResult,
  ebookType: EbookType = "lead_magnet",
): ProjectStateV3 {
  const type = isEbookType(ebookType) ? ebookType : "lead_magnet";
  const currentStrategy = current.strategy;
  const patch = result.state_patch ?? {};

  const merged: EbookStrategy = { ...currentStrategy };

  for (const key of STRATEGY_SCALAR_KEYS) {
    if (key in patch) {
      const v = (patch as Record<string, unknown>)[key];
      if (v === null || v === undefined) {
        (merged as unknown as Record<string, unknown>)[key] = null;
      } else {
        (merged as unknown as Record<string, unknown>)[key] = cleanString(v);
      }
    }
  }

  for (const key of STRATEGY_ARRAY_KEYS) {
    if (key in patch) {
      (merged as unknown as Record<string, unknown>)[key] = cleanStringArray(
        (patch as Record<string, unknown>)[key],
      );
    }
  }

  const missing_fields = computeMissingFields(merged, type);
  void clampReadinessScore(result.readiness_score);
  const nextAction = result.next_action ?? current.next_action;

  return {
    schema_version: PROJECT_STATE_SCHEMA_VERSION,
    strategy: merged,
    missing_fields,
    next_action: normalizeNextAction(nextAction, missing_fields),
    conversation_summary:
      result.conversation_summary !== undefined
        ? cleanString(result.conversation_summary)
        : current.conversation_summary,
    updated_at: new Date().toISOString(),
  };
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function normalizeStrategy(src: Record<string, unknown>): EbookStrategy {
  const nested = isRecord(src.strategy)
    ? (src.strategy as Record<string, unknown>)
    : null;

  const strategy = emptyStrategy();
  const source = nested ?? src;

  for (const key of STRATEGY_SCALAR_KEYS) {
    if (key in source) {
      (strategy as unknown as Record<string, unknown>)[key] = cleanString(
        source[key],
      );
    }
  }

  for (const key of STRATEGY_ARRAY_KEYS) {
    if (key in source) {
      (strategy as unknown as Record<string, unknown>)[key] = cleanStringArray(
        source[key],
      );
    }
  }

  return strategy;
}

function isFieldFilled(
  strategy: EbookStrategy,
  key: keyof EbookStrategy,
): boolean {
  const v = strategy[key];
  if (v === null || v === undefined) return false;
  if (typeof v === "string") return v.trim().length > 0;
  if (Array.isArray(v)) return v.length > 0;
  return false;
}

/**
 * Deterministic missing-field calculation (type-aware).
 */
export function computeMissingFields(
  strategy: EbookStrategy,
  ebookType: EbookType = "lead_magnet",
): string[] {
  const required = getRequiredStrategyFields(
    isEbookType(ebookType) ? ebookType : "lead_magnet",
  );
  const missing: string[] = [];
  for (const key of required) {
    if (!isFieldFilled(strategy, key)) {
      missing.push(key);
    }
  }
  return missing;
}

/**
 * Deterministic readiness from field completeness (0–100).
 * Base strategic fields: 70. Type-specific required: 20. Optional enrichment: 10.
 */
export function computeDeterministicReadinessScore(
  strategy: EbookStrategy,
  ebookType: EbookType = "lead_magnet",
): number {
  const type = isEbookType(ebookType) ? ebookType : "lead_magnet";
  const required = getRequiredStrategyFields(type);
  const baseKeys = BASE_REQUIRED_STRATEGY_FIELDS;
  const typeKeys = required.filter((k) => !baseKeys.includes(k));

  let baseFilled = 0;
  for (const key of baseKeys) {
    if (isFieldFilled(strategy, key)) baseFilled += 1;
  }
  const baseScore =
    baseKeys.length > 0 ? (baseFilled / baseKeys.length) * 70 : 70;

  let typeFilled = 0;
  for (const key of typeKeys) {
    if (isFieldFilled(strategy, key)) typeFilled += 1;
  }
  const typeScore =
    typeKeys.length > 0 ? (typeFilled / typeKeys.length) * 20 : 20;

  const extras: (keyof EbookStrategy)[] = [
    "audience_sophistication",
    "tone",
    "cta_goal",
    "traffic_source",
  ];
  // Only count optional fields not already required for this type
  const optionalKeys = extras.filter((k) => !required.includes(k));
  let optionalFilled = 0;
  for (const key of optionalKeys) {
    if (isFieldFilled(strategy, key)) optionalFilled += 1;
  }
  if (Array.isArray(strategy.pain_points) && strategy.pain_points.length > 0) {
    optionalFilled += 1;
  }
  if (
    Array.isArray(strategy.content_pillars) &&
    strategy.content_pillars.length > 0
  ) {
    optionalFilled += 1;
  }
  if (
    Array.isArray(strategy.buyer_objections) &&
    strategy.buyer_objections.length > 0
  ) {
    optionalFilled += 1;
  }
  // product_or_offer / funnel_goal may be optional enrichment for some types
  if (
    !required.includes("product_or_offer") &&
    isFieldFilled(strategy, "product_or_offer")
  ) {
    optionalFilled += 1;
  }
  if (
    !required.includes("funnel_goal") &&
    isFieldFilled(strategy, "funnel_goal")
  ) {
    optionalFilled += 1;
  }

  const optionalMax = optionalKeys.length + 5;
  const optionalScore =
    optionalMax > 0 ? (optionalFilled / optionalMax) * 10 : 0;

  return clampReadinessScore(
    Math.round(baseScore + typeScore + optionalScore),
  );
}

function normalizeNextAction(
  raw: string | null,
  missing: string[],
): ProjectStateV3["next_action"] {
  const valid = new Set<string>([
    "continue_strategy",
    "create_outline",
    "review_outline",
    "start_writing",
  ]);
  if (raw && valid.has(raw)) {
    return raw as ProjectStateV3["next_action"];
  }
  return missing.length > 0 ? "continue_strategy" : "create_outline";
}
