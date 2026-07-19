// Project state normalization — V2 schema migration, safe merge, and missing-field calculation.

import {
  type EbookStrategy,
  type ProjectStateV2,
  type StrategistResult,
  PROJECT_STATE_SCHEMA_VERSION,
  REQUIRED_STRATEGY_FIELDS,
} from "@/types/strategy";

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

/** Check if value is a plain non-null object (not an array). */
function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
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
];

const STRATEGY_ARRAY_KEYS: (keyof EbookStrategy)[] = [
  "pain_points",
  "content_pillars",
];

const ALL_STRATEGY_KEYS = new Set<string>([
  ...STRATEGY_SCALAR_KEYS,
  ...STRATEGY_ARRAY_KEYS,
]);

// ---------------------------------------------------------------------------
// createEmptyProjectState
// ---------------------------------------------------------------------------

export function createEmptyProjectState(): ProjectStateV2 {
  return {
    schema_version: PROJECT_STATE_SCHEMA_VERSION,
    strategy: {
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
    },
    missing_fields: [...REQUIRED_STRATEGY_FIELDS],
    next_action: "continue_strategy",
    conversation_summary: null,
    updated_at: new Date().toISOString(),
  };
}

// ---------------------------------------------------------------------------
// normalizeProjectState
// ---------------------------------------------------------------------------

/**
 * Convert any raw persisted value into a valid `ProjectStateV2`.
 *
 * - Legacy top-level strategy fields are nested under `strategy`.
 * - Unknown keys are dropped.
 * - `schema_version` is forced to 2.
 * - `updated_at` is not trusted; regenerated server-side.
 */
export function normalizeProjectState(raw: unknown): ProjectStateV2 {
  const base = createEmptyProjectState();

  if (!isRecord(raw)) return base;

  const src = raw as Record<string, unknown>;

  // ---- legacy top-level strategy fields are lifted into strategy ----
  const strategy = normalizeStrategy(src);

  // ---- known top-level V2 fields ----
  const missing_fields = computeMissingFields(strategy);

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
 * Merge an AI `StrategistResult` into the current `ProjectStateV2`.
 *
 * Rules:
 * - Explicit `null` clears a scalar.
 * - Array patch replaces the previous array.
 * - `readiness_score` is clamped to 0..100.
 * - Missing fields are recomputed deterministically.
 * - `updated_at` is always server-side generated.
 */
export function mergeProjectState(
  current: ProjectStateV2,
  result: StrategistResult,
): ProjectStateV2 {
  const currentStrategy = current.strategy;
  const patch = result.state_patch ?? {};

  const merged: EbookStrategy = { ...currentStrategy };

  // Scalar fields
  for (const key of STRATEGY_SCALAR_KEYS) {
    if (key in patch) {
      const v = (patch as Record<string, unknown>)[key];
      if (v === null || v === undefined) {
        merged[key] = null;
      } else {
        merged[key] = cleanString(v);
      }
    }
    // else: retain existing value (including null) – no change
  }

  // Array fields
  for (const key of STRATEGY_ARRAY_KEYS) {
    if (key in patch) {
      merged[key] = cleanStringArray(
        (patch as Record<string, unknown>)[key],
      );
    }
    // else: retain existing
  }

  const missing_fields = computeMissingFields(merged);

  // Clamp readiness and choose next action
  const readinessScore = clamp(result.readiness_score ?? 0, 0, 100);
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

/** Extract and sanitise EbookStrategy from raw input. */
function normalizeStrategy(src: Record<string, unknown>): EbookStrategy {
  // Prefer nested `strategy` object if present (V2+ shape)
  const nested = isRecord(src.strategy) ? (src.strategy as Record<string, unknown>) : null;

  const strategy: EbookStrategy = {
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
  };

  // If nested strategy exists, read from it; otherwise read top-level (legacy)
  const source = nested ?? src;

  for (const key of STRATEGY_SCALAR_KEYS) {
    if (key in source) {
      strategy[key] = cleanString(source[key]);
    }
  }

  for (const key of STRATEGY_ARRAY_KEYS) {
    if (key in source) {
      strategy[key] = cleanStringArray(source[key]);
    }
  }

  return strategy;
}

/**
 * Deterministic missing-field calculation.
 * A strategy field is "missing" when it is null (or empty string / empty array
 * for scalar fields) and it belongs to the required set.
 */
export function computeMissingFields(
  strategy: EbookStrategy,
): string[] {
  const missing: string[] = [];
  for (const key of REQUIRED_STRATEGY_FIELDS) {
    const v = strategy[key];
    if (v === null || v === undefined) {
      missing.push(key);
      continue;
    }
    if (typeof v === "string" && v.trim().length === 0) {
      missing.push(key);
    }
  }
  return missing;
}

/** Pick a sensible next action when the AI result doesn't supply one. */
function normalizeNextAction(
  raw: string | null,
  missing: string[],
): ProjectStateV2["next_action"] {
  const valid = new Set<string>([
    "continue_strategy",
    "create_outline",
    "review_outline",
    "start_writing",
  ]);
  if (raw && valid.has(raw)) {
    return raw as ProjectStateV2["next_action"];
  }
  // Fallback: if required fields still missing, stay in strategy
  return missing.length > 0 ? "continue_strategy" : "create_outline";
}
