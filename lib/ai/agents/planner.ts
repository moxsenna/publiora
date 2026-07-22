import { z } from "zod";
import { completeJson } from "@/lib/ai/provider";
import { PLANNER_SYSTEM } from "@/lib/ai/prompts";
import {
  StrictGenerationError,
  formatIssuesForPrompt,
  generateJsonWithSingleRepair,
  type ValidationIssue,
} from "@/lib/ai/strict-generation";
import type { OutlineSection } from "@/types/outline";
import type { EbookStrategy } from "@/types/strategy";
import type { ProjectOfferContext } from "@/types/offer";
import type { FormatContext, SectionRange } from "@/types/template";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type PlannerProject = {
  title: string;
  subtitle: string | null;
  description: string;
  audience: string;
  niche: string;
  tone: string;
  ebook_type: string;
};

export interface PlannerInput {
  project: PlannerProject;
  /** Normalized strategy state from the project_states table. */
  strategy: EbookStrategy;
  /** Readiness score from the project_states table (0-100). */
  readinessScore: number;
  /** Optional free-form user instruction to guide the AI. */
  userInstruction?: string;
  /** Accepted offer snapshot for outline patterns. */
  offer_context?: ProjectOfferContext | null;
  /** Resolved template/format rules controlling outline shape. */
  format_context: FormatContext;
}

export interface PlannerResult {
  title: string;
  description: string;
  sections: OutlineSection[];
}

export class PlannerValidationError extends Error {
  readonly issues: ValidationIssue[];

  constructor(message: string, issues: ValidationIssue[]) {
    super(message);
    this.name = "PlannerValidationError";
    this.issues = issues;
  }
}

// ---------------------------------------------------------------------------
// Strict raw schema — no substantive fabrication allowed after parse
// ---------------------------------------------------------------------------

const plannerSectionSchema = z.object({
  title: z.string().trim().min(3).max(160),
  summary: z.string().trim().min(20).max(800),
  key_points: z.array(z.string().trim().min(5).max(300)).min(2).max(6),
  estimated_words: z.number().int().min(150).max(3000),
  id: z.string().optional(),
  position: z.number().int().optional(),
  status: z.string().optional(),
});

const plannerRawSchema = z
  .object({
    title: z.string().trim().min(3).max(200),
    description: z.string().trim().min(20).max(1500),
    sections: z.array(plannerSectionSchema),
  })
  .strict();

/** @deprecated Prefer plannerRawSchema; kept for transitional imports. */
export const plannerResponseSchema = z.object({
  title: z.string().optional(),
  description: z.string().optional(),
  sections: z
    .array(
      z.object({
        id: z.string().optional(),
        position: z.number().int().optional(),
        title: z.string().optional(),
        summary: z.string().optional(),
        key_points: z.array(z.string()).optional(),
        estimated_words: z.number().optional(),
        status: z.string().optional(),
      }),
    )
    .optional(),
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function rid(): string {
  return Math.random().toString(36).slice(2, 8);
}

/** Clamp estimated words into a technical bound. Does not invent content. */
function clampWords(
  n: number,
  range: { min: number; max: number },
  fallback: number,
): number {
  if (!Number.isFinite(n)) return fallback;
  return Math.max(range.min, Math.min(range.max, Math.round(n)));
}

function dedupeKeyPoints(points: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const p of points) {
    const key = p.trim().toLowerCase();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(p.trim());
  }
  return out;
}

function issuesFromZod(err: z.ZodError): ValidationIssue[] {
  return err.issues.map((issue) => ({
    path: issue.path.join(".") || "",
    code: String(issue.code),
    message: issue.message,
  }));
}

/**
 * Technical normalization only:
 * - trim strings
 * - remove duplicate key points
 * - reassign positions
 * - clamp estimated words
 * - generate technical IDs
 *
 * Does NOT invent titles, summaries, key points, or section placeholders.
 */
export function normalizePlannerResult(
  projectTitle: string,
  raw: unknown,
  sectionRange?: SectionRange,
  targetWords?: { min: number; max: number; preferred: number },
): PlannerResult {
  const range = sectionRange ?? { min: 4, preferred: 6, max: 10 };
  const words = targetWords ?? { min: 150, max: 3000, preferred: 700 };

  let parsed: z.infer<typeof plannerRawSchema>;
  try {
    parsed = plannerRawSchema.parse(raw);
  } catch (err) {
    if (err instanceof z.ZodError) {
      throw new PlannerValidationError(
        "Planner output failed schema validation",
        issuesFromZod(err),
      );
    }
    throw err;
  }

  const issues: ValidationIssue[] = [];

  if (parsed.sections.length < range.min) {
    issues.push({
      path: "sections",
      code: "too_few_sections",
      message: `Need at least ${range.min} sections; got ${parsed.sections.length}`,
    });
  }
  if (parsed.sections.length > range.max) {
    issues.push({
      path: "sections",
      code: "too_many_sections",
      message: `Need at most ${range.max} sections; got ${parsed.sections.length}`,
    });
  }

  const sections: OutlineSection[] = [];

  parsed.sections.forEach((s, i) => {
    const key_points = dedupeKeyPoints(s.key_points);
    if (key_points.length < 2) {
      issues.push({
        path: `sections.${i}.key_points`,
        code: "insufficient_key_points",
        message: `Section ${i + 1} needs at least 2 unique key points after dedupe`,
      });
      return;
    }

    sections.push({
      id: s.id?.trim() || `sec_${i + 1}_${rid()}`,
      position: i + 1,
      title: s.title.trim(),
      summary: s.summary.trim(),
      key_points: key_points.slice(0, 6),
      estimated_words: clampWords(
        s.estimated_words,
        { min: words.min, max: words.max },
        words.preferred,
      ),
      status: "pending",
    });
  });

  if (issues.length > 0) {
    throw new PlannerValidationError(
      "Planner output failed substantive validation",
      issues,
    );
  }

  // Cap excess only when above max was not thrown (shouldn't happen).
  const finalSections = sections.slice(0, range.max);

  return {
    title: parsed.title.trim() || projectTitle,
    description: parsed.description.trim(),
    sections: finalSections,
  };
}

/** Build the planner user prompt (exported for tests / snapshots). */
export function buildPlannerUserPrompt(input: PlannerInput): string {
  const {
    project,
    strategy,
    readinessScore,
    userInstruction,
    offer_context = null,
    format_context,
  } = input;

  const strategyBlock = [
    "Strategy:",
    `  topic: ${strategy.topic ?? "(none)"}`,
    `  audience: ${strategy.audience ?? "(none)"}`,
    `  audience_sophistication: ${strategy.audience_sophistication ?? "(none)"}`,
    `  primary_problem: ${strategy.primary_problem ?? "(none)"}`,
    `  desired_outcome: ${strategy.desired_outcome ?? "(none)"}`,
    `  core_promise: ${strategy.core_promise ?? "(none)"}`,
    `  unique_angle: ${strategy.unique_angle ?? "(none)"}`,
    `  tone: ${strategy.tone ?? project.tone}`,
    `  product_or_offer: ${strategy.product_or_offer ?? "(none)"}`,
    `  funnel_goal: ${strategy.funnel_goal ?? "(none)"}`,
    `  traffic_source: ${strategy.traffic_source ?? "(none)"}`,
    `  bonus_role: ${strategy.bonus_role ?? "(none)"}`,
    `  usage_moment: ${strategy.usage_moment ?? "(none)"}`,
    `  sales_positioning: ${strategy.sales_positioning ?? "(none)"}`,
    strategy.buyer_objections?.length
      ? `  buyer_objections: ${strategy.buyer_objections.join(" | ")}`
      : "",
    strategy.content_pillars.length
      ? `  content_pillars: ${strategy.content_pillars.join(" | ")}`
      : "",
    strategy.pain_points.length
      ? `  pain_points: ${strategy.pain_points.join(" | ")}`
      : "",
    `  readiness_score: ${readinessScore}/100`,
  ]
    .filter(Boolean)
    .join("\n");

  const projectBlock = [
    `Project:`,
    `  title: ${project.title}`,
    project.subtitle ? `  subtitle: ${project.subtitle}` : "",
    `  description: ${project.description}`,
    `  audience: ${project.audience}`,
    `  niche: ${project.niche}`,
    `  tone: ${project.tone}`,
    `  ebook_type: ${project.ebook_type}`,
  ]
    .filter(Boolean)
    .join("\n");

  const offerBlock = offer_context
    ? [
        "Offer relationship context (accepted snapshot):",
        `  relationship: ${offer_context.relationship}`,
        `  offer_name: ${offer_context.snapshot.name}`,
        `  ownership: ${offer_context.snapshot.ownership}`,
        `  primary_outcome: ${offer_context.snapshot.primary_outcome ?? "(none)"}`,
      ].join("\n")
    : "Offer relationship context: (none)";

  const fc = format_context;
  const formatBlock = [
    "Selected format (FormatContext — mandatory):",
    `  template_id: ${fc.template_id ?? "(none)"}`,
    `  format: ${fc.format}`,
    `  depth: ${fc.depth}`,
    `  section_range: min=${fc.section_range.min} preferred=${fc.section_range.preferred} max=${fc.section_range.max}`,
    `  default_target_words: ${fc.default_target_words}`,
    `  target_words_range: min=${fc.target_words_range.min} max=${fc.target_words_range.max}`,
    "  structural_rules:",
    ...fc.structural_rules.map((r) => `    - ${r}`),
    "  section_output_expectations:",
    ...fc.section_output_expectations.map((r) => `    - ${r}`),
    "  quality_rules:",
    `    requires_action_steps: ${fc.quality_rules.requires_action_steps}`,
    `    requires_checklist_items: ${fc.quality_rules.requires_checklist_items}`,
    `    requires_reflection_prompts: ${fc.quality_rules.requires_reflection_prompts}`,
    `    requires_framework_components: ${fc.quality_rules.requires_framework_components}`,
    `    requires_phase_structure: ${fc.quality_rules.requires_phase_structure}`,
    `    theory_ratio_max: ${fc.quality_rules.theory_ratio_max ?? "null"}`,
  ].join("\n");

  const patternGuidance =
    project.ebook_type === "lead_magnet"
      ? "Outline pattern for lead magnet: quick problem framing → immediate insight → action steps → quick win → bridge to offer → CTA."
      : project.ebook_type === "bonus_product"
        ? "Outline pattern for bonus: when to use the bonus → setup → implementation → checklist/assets → return to parent product."
        : offer_context?.relationship === "upsells_to"
          ? "Sellable with upsell: deliver full paid value first; place upsell bridge near the end only."
          : "Sellable outline: practical depth, clear progression, no weak filler.";

  const userParts = [
    projectBlock,
    "",
    strategyBlock,
    "",
    offerBlock,
    "",
    formatBlock,
    "",
    patternGuidance,
  ];

  if (userInstruction) {
    userParts.push("", `User instruction: ${userInstruction}`);
  }

  userParts.push(
    "",
    `Build ${fc.section_range.min}-${fc.section_range.max} flat sections (prefer ${fc.section_range.preferred}). Each section must have: id, title (min 3 chars), summary (min 20 chars), 2-5 unique key_points (each min 5 chars), estimated_words (${fc.target_words_range.min}-${fc.target_words_range.max}, default ~${fc.default_target_words}). Shape every section for format "${fc.format}". Do not invent placeholder titles or key points.`,
  );

  return userParts.join("\n");
}

function validatePlannerRaw(
  projectTitle: string,
  format_context: FormatContext,
  raw: unknown,
): PlannerResult {
  return normalizePlannerResult(
    projectTitle,
    raw,
    format_context.section_range,
    {
      min: Math.max(150, format_context.target_words_range.min),
      max: Math.min(3000, format_context.target_words_range.max),
      preferred: format_context.default_target_words,
    },
  );
}

/**
 * Call the AI to build an outline from strategy + FormatContext.
 * One internal repair attempt on validation failure (no extra credits).
 */
export async function runPlanner(input: PlannerInput): Promise<PlannerResult> {
  const user = buildPlannerUserPrompt(input);
  const { format_context, project } = input;

  try {
    return await generateJsonWithSingleRepair({
      firstAttempt: () =>
        completeJson<unknown>({
          system: PLANNER_SYSTEM,
          user,
        }),
      validate: (raw) =>
        validatePlannerRaw(project.title, format_context, raw),
      repairAttempt: (issues) =>
        completeJson<unknown>({
          system: PLANNER_SYSTEM,
          user: [
            user,
            "",
            "Your previous outline failed validation. Fix ONLY the listed issues.",
            "Do not invent placeholder titles, summaries, or key points.",
            "Validation issues:",
            formatIssuesForPrompt(issues),
          ].join("\n"),
        }),
    });
  } catch (err) {
    if (err instanceof StrictGenerationError) {
      throw new PlannerValidationError(err.message, err.issues);
    }
    throw err;
  }
}
