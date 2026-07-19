import { z } from "zod";
import { completeJson } from "@/lib/ai/provider";
import { CTA_SYSTEM } from "@/lib/ai/prompts";
import { isValidCtaUrl } from "@/types/ai-suggestions";
import type { CtaSuggestion, CtaGoal, CtaGenerateRequest, CtaGenerateResponse } from "@/types/ai-suggestions";
import type { EbookStrategy } from "@/types/strategy";

// ---------------------------------------------------------------------------
// Zod schemas — server-side validation of AI output
// ---------------------------------------------------------------------------

const VALID_GOALS: CtaGoal[] = [
  "visit_product",
  "join_whatsapp",
  "claim_bonus",
  "buy_product",
  "follow_creator",
  "custom",
];

const ctaSuggestionSchema = z.object({
  goal: z.enum([
    "visit_product",
    "join_whatsapp",
    "claim_bonus",
    "buy_product",
    "follow_creator",
    "custom",
  ]),
  text: z.string().min(1, "CTA text must not be empty"),
  placement: z.enum(["ebook_end", "claim_page", "both"]),
  rationale: z.string().min(1, "Rationale must not be empty"),
});

const ctaResponseSchema = z.object({
  suggestions: z.array(ctaSuggestionSchema).min(1),
});

// ---------------------------------------------------------------------------
// Build user prompt from project + strategy
// ---------------------------------------------------------------------------

function buildUserPrompt(params: {
  request: CtaGenerateRequest;
  project: {
    title: string;
    audience: string;
    tone: string;
    ebook_type: string;
  };
  strategy?: EbookStrategy | null;
}): string {
  const { request, project, strategy } = params;

  const lines: string[] = [];

  // ---- Project context ----
  lines.push("Project:");
  lines.push(`  title: ${project.title}`);
  lines.push(`  audience: ${project.audience}`);
  lines.push(`  tone: ${project.tone}`);
  lines.push(`  ebook_type: ${project.ebook_type}`);
  lines.push("");

  // ---- Strategy context ----
  if (strategy) {
    lines.push("Strategy:");
    if (strategy.audience_sophistication) {
      lines.push(`  audience_sophistication: ${strategy.audience_sophistication}`);
    }
    if (strategy.core_promise) {
      lines.push(`  core_promise: ${strategy.core_promise}`);
    }
    if (strategy.desired_outcome) {
      lines.push(`  desired_outcome: ${strategy.desired_outcome}`);
    }
    if (strategy.primary_problem) {
      lines.push(`  primary_problem: ${strategy.primary_problem}`);
    }
    if (strategy.product_or_offer) {
      lines.push(`  product_or_offer: ${strategy.product_or_offer}`);
    }
    if (strategy.pain_points?.length) {
      lines.push(`  pain_points: ${strategy.pain_points.join(", ")}`);
    }
    if (strategy.funnel_goal) {
      lines.push(`  funnel_goal: ${strategy.funnel_goal}`);
    }
    lines.push("");
  }

  // ---- Requested CTA goal ----
  lines.push("Requested CTA:");
  lines.push(`  goal: ${request.goal}`);
  lines.push(`  placement: ${request.placement}`);
  if (request.destination_url) {
    lines.push(`  destination_url: ${request.destination_url}`);
  }
  if (request.custom_instruction) {
    lines.push(`  custom_instruction: ${request.custom_instruction}`);
  }
  lines.push("");
  lines.push(
    `Generate 4-6 differentiated CTA suggestions for the goal "${request.goal}"`,
    `and placement "${request.placement}". Vary copy angles, emotional hooks,`,
    `and framing. Do NOT include the URL inside the CTA text — that field is separate.`,
    `Match the audience sophistication and tone from the strategy.`,
  );

  return lines.join("\n");
}

// ---------------------------------------------------------------------------
// Normalize / deduplicate
// ---------------------------------------------------------------------------

function normalizeCtas(
  suggestions: CtaSuggestion[],
  goal: CtaGoal,
  placement: CtaSuggestion["placement"],
): CtaSuggestion[] {
  // Strip unsafe link-like text from CTA text (but NOT from rationale)
  // and trim results
  const cleaned = suggestions.map((s) => ({
    ...s,
    text: s.text.trim(),
    rationale: s.rationale.trim(),
  }));

  // Deduplicate by normalized text (case-insensitive, whitespace-collapsed)
  const seen = new Set<string>();
  const deduped: CtaSuggestion[] = [];

  for (const s of cleaned) {
    const key = s.text.toLowerCase().replace(/\s+/g, " ").trim();
    if (seen.has(key)) continue;
    seen.add(key);

    // Force consistency: goal and placement must match the request
    deduped.push({
      goal,
      text: s.text,
      placement,
      rationale: s.rationale,
    });
  }

  return deduped.slice(0, 6);
}

// ---------------------------------------------------------------------------
// runCtaGenerator
// ---------------------------------------------------------------------------

export async function runCtaGenerator(params: {
  request: CtaGenerateRequest;
  project: {
    title: string;
    audience: string;
    tone: string;
    ebook_type: string;
  };
  strategy?: EbookStrategy | null;
}): Promise<CtaGenerateResponse> {
  const { request, project, strategy } = params;

  // Validate request fields server-side
  if (!VALID_GOALS.includes(request.goal)) {
    throw new Error(`Invalid CTA goal: ${request.goal}`);
  }

  // For goals that require a URL, validate the destination
  if (request.destination_url !== null && request.destination_url !== undefined) {
    if (!isValidCtaUrl(request.destination_url)) {
      throw new Error(
        `Invalid destination_url: "${request.destination_url}". Must be a valid http/https URL.`,
      );
    }
  }

  const user = buildUserPrompt({ request, project, strategy });

  const raw = await completeJson<unknown>({
    system: CTA_SYSTEM,
    user,
  });

  const parsed = ctaResponseSchema.parse(raw);
  const normalized = normalizeCtas(parsed.suggestions, request.goal, request.placement);

  if (!normalized.length) {
    throw new Error("CTA generator returned no suggestions");
  }

  return { suggestions: normalized };
}

// Exported for testing
export { ctaSuggestionSchema, ctaResponseSchema, normalizeCtas };
