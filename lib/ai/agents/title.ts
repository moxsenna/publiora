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

  // Exactly one unique style each; no synthetic/mock fallbacks.
  const seen = new Set<TitleStyle>();
  const result: TitleSuggestion[] = [];

  for (const s of suggestions) {
    if (!seen.has(s.style)) {
      seen.add(s.style);
      result.push({
        style: s.style,
        title: s.title.trim(),
        rationale: s.rationale.trim(),
      });
    }
  }

  const missing = VALID_STYLES.filter((style) => !seen.has(style));
  if (missing.length > 0) {
    throw new Error(
      `Title generator missing styles: ${missing.join(", ")}. Got ${result.length} unique styles.`,
    );
  }

  return VALID_STYLES.map((style) => {
    const found = result.find((s) => s.style === style)!;
    return found;
  });
}
