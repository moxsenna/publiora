import { z } from "zod";
import { completeJson } from "@/lib/ai/provider";
import { ENHANCEMENT_SYSTEM } from "@/lib/ai/prompts";
import { sanitizeHtml } from "@/lib/sanitize";
import type { EnhancementAction, EnhancementSuggestion } from "@/types/ai-suggestions";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Maximum input content length (characters). Beyond this the route rejects. */
export const MAX_CONTENT_LENGTH = 50_000;

// ---------------------------------------------------------------------------
// Action-specific instruction phrases
// ---------------------------------------------------------------------------

const ACTION_INSTRUCTIONS: Record<
  EnhancementAction,
  { instruction: string; sampleHint?: string }
> = {
  expand: {
    instruction:
      "Add depth and detail to this section without changing its core claim or introducing new topics.",
  },
  shorten: {
    instruction:
      "Reduce the length of this section while preserving all key points and meaning. Cut filler but keep substance.",
  },
  simplify: {
    instruction:
      "Rewrite this section with clearer, shorter sentences and simpler vocabulary. Make it easier to read without losing expertise.",
  },
  persuasive: {
    instruction:
      "Reframe this section to be more persuasive: emphasize benefits and evidence. Do NOT fabricate statistics, testimonials, data, or guarantees.",
  },
  professional: {
    instruction:
      "Improve the structure, tone, and precision of this section for a professional business audience. Use clearer paragraph breaks and more authoritative language.",
  },
  add_examples: {
    instruction:
      "Add labeled, realistic examples to illustrate the concepts in this section. Do NOT claim these are real data, case studies, or client results. Use phrases like 'For example' or 'Consider this scenario'.",
  },
  add_checklist: {
    instruction:
      "Extract or create an actionable checklist from the content of this section. Use <ul> tags with clear, concrete action items.",
  },
};

// ---------------------------------------------------------------------------
// Zod schema for AI response validation
// ---------------------------------------------------------------------------

const enhancementAiResponseSchema = z.object({
  suggested_html: z.string().min(1, "suggested_html must not be empty"),
  summary: z.string().optional(),
});

export type EnhancementAiRaw = z.infer<typeof enhancementAiResponseSchema>;

// ---------------------------------------------------------------------------
// Word count helper
// ---------------------------------------------------------------------------

/** Count words by stripping HTML tags and splitting on whitespace. */
export function countWordsFromHtml(html: string): number {
  if (!html) return 0;
  return html
    .replace(/<[^>]+>/g, " ")
    .split(/\s+/)
    .filter(Boolean).length;
}

// ---------------------------------------------------------------------------
// normalizeEnhancementResult
// ---------------------------------------------------------------------------

/**
 * Validate raw AI JSON and normalize into a clean `EnhancementSuggestion`.
 *
 * Exported so tests can exercise normalization without calling the AI.
 */
export function normalizeEnhancementResult(
  action: EnhancementAction,
  originalHtml: string,
  raw: unknown,
): EnhancementSuggestion {
  const parsed = enhancementAiResponseSchema.safeParse(raw);

  if (!parsed.success) {
    throw new Error(
      `Enhancement AI returned invalid shape: ${parsed.error.message}`,
    );
  }

  const suggestedRaw = parsed.data.suggested_html;

  if (!suggestedRaw || !suggestedRaw.trim()) {
    throw new Error("Enhancement returned empty suggested_html");
  }

  const suggestedHtml = sanitizeHtml(suggestedRaw);

  if (!suggestedHtml.trim()) {
    throw new Error(
      "Enhancement suggested_html was empty after sanitization",
    );
  }

  const originalWordCount = countWordsFromHtml(originalHtml);
  const suggestedWordCount = countWordsFromHtml(suggestedHtml);

  return {
    action,
    original_html: originalHtml,
    suggested_html: suggestedHtml,
    summary: parsed.data.summary?.trim() || "Content enhanced.",
    original_word_count: originalWordCount,
    suggested_word_count: suggestedWordCount,
  };
}

// ---------------------------------------------------------------------------
// runEnhancement
// ---------------------------------------------------------------------------

export interface EnhancementInput {
  action: EnhancementAction;
  content_html: string;
  selection_html?: string | null;
  instruction?: string | null;
  section?: { title?: string; summary?: string };
}

/**
 * Call the AI to enhance a section of HTML.
 *
 * The returned suggestion is non-destructive: it does NOT write to the database.
 * The caller is responsible for persisting only if the user accepts the suggestion.
 */
export async function runEnhancement(
  input: EnhancementInput,
): Promise<EnhancementSuggestion> {
  const {
    action,
    content_html,
    selection_html,
    instruction,
    section,
  } = input;

  // Select the working HTML: prefer selection, fall back to full content
  const workingHtml = selection_html?.trim() || content_html;

  if (!workingHtml) {
    throw new Error("No content to enhance");
  }

  if (workingHtml.length > MAX_CONTENT_LENGTH) {
    throw new Error(
      `Content too large (${workingHtml.length} chars). Maximum is ${MAX_CONTENT_LENGTH}.`,
    );
  }

  const sanitizedOriginal = sanitizeHtml(workingHtml);

  if (!sanitizedOriginal.trim()) {
    throw new Error("Content was empty after sanitization");
  }

  // ---- Build user prompt ----

  const actionDef = ACTION_INSTRUCTIONS[action];

  const contextLines: string[] = [];

  if (section?.title) {
    contextLines.push(`Section title: ${section.title}`);
  }
  if (section?.summary) {
    contextLines.push(`Section summary: ${section.summary}`);
  }

  let userPrompt = [
    `Action: ${action}`,
    actionDef.instruction,
    "",
    ...(contextLines.length ? [...contextLines, ""] : []),
  ].join("\n");

  if (instruction) {
    userPrompt += `\nAdditional instruction: ${instruction}`;
  }

  userPrompt += `\n\nHTML to enhance:\n${sanitizedOriginal}`;

  // ---- Call AI + validate ----

  const raw = await completeJson<unknown>({
    system: ENHANCEMENT_SYSTEM,
    user: userPrompt,
  });

  return normalizeEnhancementResult(action, sanitizedOriginal, raw);
}
