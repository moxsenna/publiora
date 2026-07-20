import { z } from "zod";
import { completeJson } from "@/lib/ai/provider";
import { STRATEGIST_SYSTEM } from "@/lib/ai/prompts";
import type { EbookStrategy, ProjectStateV2, StrategistResult } from "@/types/strategy";
import { normalizeStrategySuggestedReplies } from "@/lib/ai/strategy-suggestions";

// ---------------------------------------------------------------------------
// Zod schema for the raw AI JSON response. Matches StrategistResult domain type.
// ---------------------------------------------------------------------------

const strategyFieldSchema = z.string().trim().nullable().optional();

const strategyFieldEnum = z.enum([
  "topic",
  "audience",
  "audience_sophistication",
  "primary_problem",
  "pain_points",
  "desired_outcome",
  "core_promise",
  "unique_angle",
  "content_pillars",
  "product_or_offer",
  "funnel_goal",
  "cta_goal",
  "tone",
]);

const suggestedReplySchema = z.object({
  label: z.string().trim().min(1).max(48),
  message: z.string().trim().min(1).max(240),
  field: strategyFieldEnum.nullable().optional(),
  intent: z
    .enum(["answer", "ask_recommendation", "confirm", "clarify"])
    .default("answer"),
});

export const aiStrategistResponseSchema = z.object({
  assistant_message: z.string().trim().min(1, "assistant_message must be non-empty"),
  state_patch: z
    .object({
      topic: strategyFieldSchema,
      audience: strategyFieldSchema,
      audience_sophistication: strategyFieldSchema,
      primary_problem: strategyFieldSchema,
      pain_points: z.array(z.string().trim()).optional(),
      desired_outcome: strategyFieldSchema,
      core_promise: strategyFieldSchema,
      unique_angle: strategyFieldSchema,
      content_pillars: z.array(z.string().trim()).optional(),
      product_or_offer: strategyFieldSchema,
      funnel_goal: strategyFieldSchema,
      cta_goal: strategyFieldSchema,
      tone: strategyFieldSchema,
    })
    .default({}),
  readiness_score: z.number().min(0).max(100).default(50),
  missing_fields: z.array(z.string()).default([]),
  next_action: z
    .enum(["continue_strategy", "create_outline", "review_outline", "start_writing"])
    .default("continue_strategy"),
  conversation_summary: z.string().nullable().optional(),
  suggested_replies: z.array(suggestedReplySchema).max(4).default([]),
  response_language: z.enum(["id", "en"]).default("id"),
});

// ---------------------------------------------------------------------------
// Input type — includes everything needed for a quality strategist turn
// ---------------------------------------------------------------------------

export interface StrategistInput {
  /** Current normalized project state (empty defaults when none persisted). */
  currentState: ProjectStateV2;
  /** Project metadata from the projects table. */
  project: {
    title: string;
    description: string;
    audience: string;
    tone: string;
    niche: string;
  };
  /** Recent chat messages (role + content). */
  history: { role: string; content: string }[];
  /** The latest user message for this turn. */
  userMessage: string;
}

// ---------------------------------------------------------------------------
// parseStrategistResponse
// ---------------------------------------------------------------------------

/**
 * Validate and transform raw AI JSON into a domain `StrategistResult`.
 * Exported so tests can exercise the schema directly without calling the AI.
 */
export function parseStrategistResponse(raw: unknown): StrategistResult {
  const parsed = aiStrategistResponseSchema.parse(raw);

  // Cast state_patch (zod already validated, but narrow to Partial<EbookStrategy>)
  const statePatch: Partial<EbookStrategy> = {};
  const sp = parsed.state_patch;
  const scalarKeys = [
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
  ] as const;
  for (const key of scalarKeys) {
    if (key in sp) {
      const v = sp[key];
      (statePatch as Record<string, unknown>)[key] =
        v === undefined || v === null ? null : v;
    }
  }
  const arrayKeys = ["pain_points", "content_pillars"] as const;
  for (const key of arrayKeys) {
    if (key in sp) {
      (statePatch as Record<string, unknown>)[key] = sp[key] ?? [];
    }
  }

  return {
    assistant_message: parsed.assistant_message,
    state_patch: statePatch,
    readiness_score: parsed.readiness_score,
    missing_fields: parsed.missing_fields,
    next_action: parsed.next_action,
    conversation_summary: parsed.conversation_summary ?? undefined,
    suggested_replies: normalizeStrategySuggestedReplies(
      parsed.suggested_replies,
      parsed.missing_fields,
    ),
    response_language: parsed.response_language,
  };
}

// ---------------------------------------------------------------------------
// runStrategist
// ---------------------------------------------------------------------------

/**
 * Ask the AI to refine the ebook strategy. Returns a domain-validated
 * `StrategistResult` ready for `mergeProjectState`.
 */
export async function runStrategist(
  input: StrategistInput,
): Promise<StrategistResult> {
  const {
    currentState,
    project,
    history,
    userMessage,
  } = input;

  // ---- Build prompt ----

  const currentStateBlock = [
    "Current strategy state:",
    `  topic: ${currentState.strategy.topic ?? "(none)"}`,
    `  audience: ${currentState.strategy.audience ?? "(none)"}`,
    `  audience_sophistication: ${currentState.strategy.audience_sophistication ?? "(none)"}`,
    `  primary_problem: ${currentState.strategy.primary_problem ?? "(none)"}`,
    `  pain_points: ${currentState.strategy.pain_points.length ? currentState.strategy.pain_points.join(" | ") : "(none)"}`,
    `  desired_outcome: ${currentState.strategy.desired_outcome ?? "(none)"}`,
    `  core_promise: ${currentState.strategy.core_promise ?? "(none)"}`,
    `  unique_angle: ${currentState.strategy.unique_angle ?? "(none)"}`,
    `  content_pillars: ${currentState.strategy.content_pillars.length ? currentState.strategy.content_pillars.join(" | ") : "(none)"}`,
    `  product_or_offer: ${currentState.strategy.product_or_offer ?? "(none)"}`,
    `  funnel_goal: ${currentState.strategy.funnel_goal ?? "(none)"}`,
    `  cta_goal: ${currentState.strategy.cta_goal ?? "(none)"}`,
    `  tone: ${currentState.strategy.tone ?? "(none)"}`,
    `  missing_fields: ${currentState.missing_fields.length ? currentState.missing_fields.join(", ") : "(none)"}`,
    `  next_action: ${currentState.next_action}`,
    currentState.conversation_summary
      ? `  conversation_summary: ${currentState.conversation_summary}`
      : "",
  ]
    .filter(Boolean)
    .join("\n");

  const historyText = history
    .slice(-12)
    .map((m) => `${m.role}: ${m.content}`)
    .join("\n");

  const user = [
    `Project metadata:`,
    `  title: ${project.title}`,
    `  description: ${project.description}`,
    `  audience: ${project.audience}`,
    `  tone: ${project.tone}`,
    `  niche: ${project.niche}`,
    "",
    currentStateBlock,
    "",
    "Recent conversation:",
    historyText || "(none)",
    "",
    `Latest user message:`,
    userMessage,
  ].join("\n");

  // ---- Call AI + validate ----

  const raw = await completeJson<unknown>({
    system: STRATEGIST_SYSTEM,
    user,
  });

  return parseStrategistResponse(raw);
}
