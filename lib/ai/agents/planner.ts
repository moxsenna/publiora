import { z } from "zod";
import { completeJson } from "@/lib/ai/provider";
import { PLANNER_SYSTEM } from "@/lib/ai/prompts";
import type { OutlineSection } from "@/types/outline";
import type { EbookStrategy } from "@/types/strategy";

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
}

export interface PlannerResult {
  title: string;
  description: string;
  sections: OutlineSection[];
}

// ---------------------------------------------------------------------------
// Zod schema — permissive AI response parsing
//
// The schema is deliberately loose: the AI may return missing fields, NaN,
// out-of-range values, or invalid enums.  All validation & cleanup happens in
// `normalizePlannerResult` below, mirroring the strategist pattern where
// `parseStrategistResponse` owns all coercion.
// ---------------------------------------------------------------------------

const outlineSectionSchema = z.object({
  id: z.string().optional(),
  position: z.number().int().optional(),
  title: z.string().optional(),
  summary: z.string().optional(),
  key_points: z.array(z.string()).optional(),
  estimated_words: z.number().optional(),
  status: z.string().optional(),
});

export const plannerResponseSchema = z.object({
  title: z.string().optional(),
  description: z.string().optional(),
  sections: z.array(outlineSectionSchema).optional(),
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function rid(): string {
  return Math.random().toString(36).slice(2, 8);
}

/** Clamp a word count into the valid range [300, 1200]. Defaults to 700 for non-finite. */
function clampWords(n: number): number {
  if (!Number.isFinite(n)) return 700;
  return Math.max(300, Math.min(1200, Math.round(n)));
}

/**
 * Clean key_points to 2–5 non-empty strings.
 * Pads from title/summary when AI returns 0–1 valid points.
 */
function normalizeKeyPoints(
  raw: unknown,
  title: string,
  summary: string,
): string[] {
  const points = Array.isArray(raw)
    ? raw
        .filter((k): k is string => typeof k === "string" && k.trim().length > 0)
        .map((k) => k.trim())
        .slice(0, 5)
    : [];

  if (points.length < 2) {
    const cover = `Cover: ${title}`;
    if (!points.includes(cover)) points.push(cover);
  }

  if (points.length < 2) {
    const fromSummary = summary
      .split(/[.!?]/)
      .map((s) => s.trim())
      .find((s) => s.length > 0 && !points.includes(s));
    const fallback = fromSummary ?? `Expand: ${title}`;
    if (!points.includes(fallback)) points.push(fallback);
  }

  // Guarantee length >= 2 even if title/summary empty or duplicates
  while (points.length < 2) {
    points.push(`Key point ${points.length + 1}`);
  }

  return points.slice(0, 5);
}

// ---------------------------------------------------------------------------
// normalizePlannerResult
// ---------------------------------------------------------------------------

/**
 * Validate raw AI JSON and normalize into a clean `PlannerResult`.
 *
 * Normalization rules:
 * - Require 5–10 sections (throw if fewer than 5 after cap; cap at 10)
 * - Every section gets a stable id (preserve AI id or generate one)
 * - `position` is reassigned sequentially from 1
 * - `title` must be non-empty; falls back to "Section {N}"
 * - `summary` defaults to ""
 * - `key_points` enforced to 2–5 items (pad from title/summary if needed)
 * - `estimated_words` clamped to [300, 1200]; defaults to 700
 * - `status` is always "pending"
 *
 * Exported so tests can exercise normalization without calling the AI.
 */
export function normalizePlannerResult(
  projectTitle: string,
  raw: unknown,
): PlannerResult {
  const parsed = plannerResponseSchema.parse(raw);

  const rawSections = parsed.sections ?? [];

  if (rawSections.length === 0) {
    throw new Error("Planner returned no sections");
  }

  const sections: OutlineSection[] = rawSections
    .slice(0, 10)
    .map((s, i) => {
      const title = s.title?.trim() || `Section ${i + 1}`;
      const summary = s.summary?.trim() || "";
      return {
        id: s.id || `sec_${i + 1}_${rid()}`,
        position: i + 1,
        title,
        summary,
        key_points: normalizeKeyPoints(s.key_points, title, summary),
        estimated_words: clampWords(s.estimated_words ?? 700),
        status: "pending" as const,
      };
    });

  if (sections.length < 5) {
    throw new Error(
      `Planner returned ${sections.length} sections; need 5-10`,
    );
  }

  return {
    title: parsed.title || projectTitle,
    description: parsed.description || "",
    sections,
  };
}

// ---------------------------------------------------------------------------
// runPlanner
// ---------------------------------------------------------------------------

/**
 * Call the AI to build an outline from strategy state.
 *
 * The planner receives the full strategy so it can respect:
 * - audience sophistication
 * - core promise and unique angle
 * - desired outcome
 * - tone
 */
export async function runPlanner(input: PlannerInput): Promise<PlannerResult> {
  const { project, strategy, readinessScore, userInstruction } = input;

  // ---- Build user prompt ----

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

  const userParts = [
    projectBlock,
    "",
    strategyBlock,
  ];

  if (userInstruction) {
    userParts.push("", `User instruction: ${userInstruction}`);
  }

  userParts.push(
    "",
    "Build 5-10 flat sections. Each section must have: id, title, summary (1-2 sentences), 2-5 key_points, estimated_words (300-1200).",
  );

  const user = userParts.join("\n");

  // ---- Call AI + validate ----

  const raw = await completeJson<unknown>({
    system: PLANNER_SYSTEM,
    user,
  });

  return normalizePlannerResult(project.title, raw);
}
