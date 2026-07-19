import { z } from "zod";
import { completeJson } from "@/lib/ai/provider";
import { TITLE_SYSTEM } from "@/lib/ai/prompts";
import type { TitleSuggestion, TitleStyle } from "@/types/ai-suggestions";
import type { EbookStrategy } from "@/types/strategy";

// ---------------------------------------------------------------------------
// Zod schema
// ---------------------------------------------------------------------------

const VALID_STYLES: TitleStyle[] = [
  "curiosity",
  "authority",
  "practical",
  "contrarian",
  "outcome",
];

export const titleSuggestionSchema = z.object({
  style: z.enum([
    "curiosity",
    "authority",
    "practical",
    "contrarian",
    "outcome",
  ]),
  title: z.string().min(1),
  rationale: z.string().min(1),
});

export const titleResponseSchema = z.object({
  suggestions: z.array(titleSuggestionSchema),
});

// ---------------------------------------------------------------------------
// runTitleGenerator
// ---------------------------------------------------------------------------

export async function runTitleGenerator(params: {
  project: {
    title: string;
    description: string;
    audience: string;
    tone: string;
    ebook_type: string;
  };
  strategy?: EbookStrategy | null;
}): Promise<TitleSuggestion[]> {
  const { project, strategy } = params;

  const strategyBlock = strategy
    ? [
        "Strategy:",
        `  topic: ${strategy.topic ?? "(none)"}`,
        `  audience: ${strategy.audience ?? "(none)"}`,
        `  desired_outcome: ${strategy.desired_outcome ?? "(none)"}`,
        `  core_promise: ${strategy.core_promise ?? "(none)"}`,
        `  unique_angle: ${strategy.unique_angle ?? "(none)"}`,
        `  tone: ${strategy.tone ?? project.tone}`,
      ].join("\n")
    : "";

  const userParts = [
    `Project:`,
    `  title: ${project.title}`,
    `  description: ${project.description}`,
    `  audience: ${project.audience}`,
    `  tone: ${project.tone}`,
    `  ebook_type: ${project.ebook_type}`,
  ];

  if (strategyBlock) {
    userParts.push("", strategyBlock);
  }

  userParts.push("", "Generate exactly 5 title suggestions, one per style.");

  const raw = await completeJson<unknown>({
    system: TITLE_SYSTEM,
    user: userParts.join("\n"),
  });

  const parsed = titleResponseSchema.parse(raw);
  const suggestions = parsed.suggestions;

  if (!suggestions.length) {
    throw new Error("Title generator returned no suggestions");
  }

  // Ensure we have exactly one per style, deduping by style preference order
  const seen = new Set<TitleStyle>();
  const result: TitleSuggestion[] = [];

  for (const s of suggestions) {
    if (!seen.has(s.style)) {
      seen.add(s.style);
      result.push({ style: s.style, title: s.title, rationale: s.rationale });
    }
  }

  // Fill any missing styles with fallback
  for (const style of VALID_STYLES) {
    if (!seen.has(style)) {
      result.push({
        style,
        title: project.title,
        rationale: `Based on the ${style} approach for ${project.audience}.`,
      });
    }
  }

  return result.slice(0, 5);
}
