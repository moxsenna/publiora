import { z } from "zod";
import { completeJson } from "@/lib/ai/provider";
import type { FormatContext } from "@/types/template";
import type { EbookStrategy } from "@/types/strategy";
import type { OutlineSection } from "@/types/outline";
import type { ProjectOfferContext } from "@/types/offer";
import type { AiQualityReviewResult } from "@/types/quality-review";

const issueSchema = z.object({
  severity: z.enum(["warning", "important"]),
  category: z.string().trim().min(2).max(80),
  section_id: z.string().nullable(),
  title: z.string().trim().min(3).max(200),
  explanation: z.string().trim().min(10).max(1200),
  suggested_action: z.string().trim().min(5).max(800),
});

const reviewSchema = z
  .object({
    summary: z.string().trim().min(20).max(2000),
    issues: z.array(issueSchema).max(30),
  })
  .strict();

export const REVIEWER_SYSTEM = `You are Publiora Quality Reviewer.
Analyze the ebook draft and return suggestions only — never rewrite section bodies.

Focus on:
- repeated ideas
- contradictions
- promise alignment
- offer alignment
- audience suitability
- weak transitions
- unsupported claims
- over-promotion
- type/format mismatch

Return JSON only:
{
  "summary": string,
  "issues": [
    {
      "severity": "warning" | "important",
      "category": string,
      "section_id": string | null,
      "title": string,
      "explanation": string,
      "suggested_action": string
    }
  ]
}`;

export type ReviewerInput = {
  project: {
    title: string;
    audience: string;
    tone: string;
    niche: string;
    ebook_type: string;
  };
  strategy: EbookStrategy;
  format_context: FormatContext;
  outline_sections: Array<Pick<OutlineSection, "id" | "title" | "summary" | "position">>;
  sections: Array<{
    id: string;
    outline_section_id: string;
    title: string;
    content_html: string;
    word_count: number;
  }>;
  offer_context?: ProjectOfferContext | null;
};

export function buildReviewerUserPrompt(input: ReviewerInput): string {
  const fc = input.format_context;
  const sectionBlocks = input.sections
    .slice()
    .sort((a, b) => a.title.localeCompare(b.title))
    .map((s) => {
      const plain = s.content_html
        .replace(/<[^>]+>/g, " ")
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, 1200);
      return [
        `Section id=${s.id} outline=${s.outline_section_id}`,
        `  title: ${s.title}`,
        `  words: ${s.word_count}`,
        `  body: ${plain}`,
      ].join("\n");
    })
    .join("\n\n");

  return [
    "Project:",
    `  title: ${input.project.title}`,
    `  audience: ${input.project.audience}`,
    `  tone: ${input.project.tone}`,
    `  niche: ${input.project.niche}`,
    `  ebook_type: ${input.project.ebook_type}`,
    "",
    "Strategy:",
    `  core_promise: ${input.strategy.core_promise ?? "(none)"}`,
    `  unique_angle: ${input.strategy.unique_angle ?? "(none)"}`,
    `  desired_outcome: ${input.strategy.desired_outcome ?? "(none)"}`,
    `  primary_problem: ${input.strategy.primary_problem ?? "(none)"}`,
    "",
    "FormatContext:",
    `  format: ${fc.format}`,
    `  depth: ${fc.depth}`,
    `  structural_rules: ${fc.structural_rules.join(" | ")}`,
    "",
    input.offer_context
      ? `Offer: ${input.offer_context.snapshot.name} (${input.offer_context.relationship})`
      : "Offer: (none)",
    "",
    "Outline:",
    ...input.outline_sections.map(
      (s) => `  ${s.position}. [${s.id}] ${s.title} — ${s.summary}`,
    ),
    "",
    "Sections:",
    sectionBlocks || "(no sections)",
    "",
    "Return suggestions only. Do not rewrite content_html.",
  ].join("\n");
}

export async function runQualityReviewer(
  input: ReviewerInput,
): Promise<AiQualityReviewResult> {
  const raw = await completeJson<unknown>({
    system: REVIEWER_SYSTEM,
    user: buildReviewerUserPrompt(input),
  });
  const parsed = reviewSchema.parse(raw);
  return {
    summary: parsed.summary,
    issues: parsed.issues.map((i) => ({
      ...i,
      section_id: i.section_id ?? null,
    })),
  };
}
