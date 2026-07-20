import { z } from "zod";
import { completeJson } from "@/lib/ai/provider";
import { STRATEGIST_SYSTEM } from "@/lib/ai/prompts";
import type { EbookStrategy, ProjectStateV2, StrategistResult } from "@/types/strategy";
import { normalizeStrategySuggestedReplies } from "@/lib/ai/strategy-suggestions";
import type { ProjectOfferContext } from "@/types/offer";
import { ownershipCopyGuidance } from "@/lib/offers/copy";

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
  "traffic_source",
  "bonus_role",
  "usage_moment",
  "sales_positioning",
  "buyer_objections",
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
      traffic_source: strategyFieldSchema,
      bonus_role: strategyFieldSchema,
      usage_moment: strategyFieldSchema,
      sales_positioning: strategyFieldSchema,
      buyer_objections: z.array(z.string().trim()).optional(),
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
    ebook_type?: "lead_magnet" | "bonus_product" | "sellable_ebook";
    cta_goal?: string | null;
    cta_url_present?: boolean;
    template_id?: string | null;
  };
  /** Recent chat messages (role + content). */
  history: { role: string; content: string }[];
  /** The latest user message for this turn. */
  userMessage: string;
  /** Accepted project offer snapshot (never live offer unless synced). */
  offer_context?: ProjectOfferContext | null;
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
    "traffic_source",
    "bonus_role",
    "usage_moment",
    "sales_positioning",
  ] as const;
  for (const key of scalarKeys) {
    if (key in sp) {
      const v = sp[key];
      (statePatch as Record<string, unknown>)[key] =
        v === undefined || v === null ? null : v;
    }
  }
  const arrayKeys = [
    "pain_points",
    "content_pillars",
    "buyer_objections",
  ] as const;
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
    offer_context = null,
  } = input;

  // ---- Build prompt ----

  const offerBlock = offer_context
    ? [
        "Linked offer context (accepted snapshot — do not invent product details):",
        `  relationship: ${offer_context.relationship}`,
        `  name: ${offer_context.snapshot.name}`,
        `  offer_type: ${offer_context.snapshot.offer_type}`,
        `  ownership: ${offer_context.snapshot.ownership}`,
        `  ownership_guidance: ${ownershipCopyGuidance(offer_context.snapshot.ownership)}`,
        `  short_description: ${offer_context.snapshot.short_description ?? "(none)"}`,
        `  target_audience: ${offer_context.snapshot.target_audience ?? "(none)"}`,
        `  primary_problem: ${offer_context.snapshot.primary_problem ?? "(none)"}`,
        `  primary_outcome: ${offer_context.snapshot.primary_outcome ?? "(none)"}`,
        `  niche: ${offer_context.snapshot.niche ?? "(none)"}`,
        `  destination_url_present: ${offer_context.snapshot.destination_url ? "yes" : "no"}`,
        `  source_is_newer: ${offer_context.source_is_newer ? "yes (informational only — do not auto-use live offer)" : "no"}`,
      ].join("\n")
    : "Linked offer context: (none)";

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
    `  traffic_source: ${currentState.strategy.traffic_source ?? "(none)"}`,
    `  bonus_role: ${currentState.strategy.bonus_role ?? "(none)"}`,
    `  usage_moment: ${currentState.strategy.usage_moment ?? "(none)"}`,
    `  sales_positioning: ${currentState.strategy.sales_positioning ?? "(none)"}`,
    `  buyer_objections: ${currentState.strategy.buyer_objections?.length ? currentState.strategy.buyer_objections.join(" | ") : "(none)"}`,
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

  const ebookType = project.ebook_type ?? "lead_magnet";
  const typeGuidance =
    ebookType === "lead_magnet"
      ? offer_context
        ? "Ebook type: lead_magnet WITH linked offer. Understand product outcome; define a smaller quick win that leads to it; avoid sales brochure; do not invent product features; do not re-ask known audience/niche/offer name."
        : "Ebook type: lead_magnet WITHOUT offer. Do not block. Help audience/value first; later clarify next offer if needed. Do not re-ask known funnel_goal/traffic_source."
      : ebookType === "bonus_product"
        ? "Ebook type: bonus_product. Anchor to linked parent offer snapshot. Bonus must complement not duplicate parent. Ask usage moment only if missing. Keep bonus outcome narrower than parent outcome."
        : offer_context
          ? "Ebook type: sellable_ebook with linked destination/bundle offer. Deliver standalone paid value; upsell/cross-sell only near end; do not weaken paid product."
          : "Ebook type: sellable_ebook. Ensure standalone paid value, clear differentiation, sufficient depth, address buyer_objections honestly.";

  const user = [
    `Project metadata:`,
    `  title: ${project.title}`,
    `  description: ${project.description}`,
    `  audience: ${project.audience}`,
    `  tone: ${project.tone}`,
    `  niche: ${project.niche}`,
    `  ebook_type: ${ebookType}`,
    `  cta_goal: ${project.cta_goal ?? "(none)"}`,
    `  cta_url_present: ${project.cta_url_present ? "yes" : "no"}`,
    `  template_id: ${project.template_id ?? "(none)"}`,
    "",
    offerBlock,
    "",
    typeGuidance,
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
