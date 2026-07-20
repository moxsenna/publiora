// Normalize create-project requests into project insert + initial Strategy V3.

import {
  type CreateProjectRequestV2,
  type LegacyProjectInput,
} from "@/lib/projects/create-project-schema";
import {
  DEFAULT_COVER_COLOR,
  DEFAULT_TONE,
} from "@/lib/projects/project-create-defaults";
import {
  EBOOK_TYPE_LABELS,
  LEAD_GOAL_LABELS,
} from "@/lib/projects/project-type-copy";
import {
  computeDeterministicReadinessScore,
  computeMissingFields,
  createEmptyProjectState,
} from "@/lib/project-state/normalize";
import type { EbookType, LeadGoal } from "@/types/project";
import type { CtaGoal } from "@/types/ai-suggestions";
import type { EbookStrategy, ProjectStateV3 } from "@/types/strategy";
import { CTA_URL_REQUIRED_GOALS } from "@/types/ai-suggestions";

export interface ProjectInsertPayload {
  owner_id: string;
  title: string;
  author: string;
  subtitle: string | null;
  description: string;
  audience: string;
  tone: string;
  niche: string;
  ebook_type: EbookType;
  template_id: string | null;
  status: "draft";
  progress: number;
  sections_generated: number;
  total_sections: number;
  cover_color: string;
  cta_goal: CtaGoal | null;
  cta_url: string | null;
  final_cta: string | null;
}

export interface NormalizedCreateProject {
  projectInsert: ProjectInsertPayload;
  initialState: ProjectStateV3;
  readinessScore: number;
}

export function buildWorkingTitle(input: {
  working_title?: string | null;
  topic?: string | null;
  ebook_type: EbookType;
}): string {
  const working = input.working_title?.trim();
  if (working) return working.slice(0, 120);

  const topic = input.topic?.trim();
  if (topic) {
    const title = `Panduan: ${topic}`;
    return title.slice(0, 120);
  }

  return `${EBOOK_TYPE_LABELS[input.ebook_type]} Baru`.slice(0, 120);
}

export function buildProjectDescription(input: CreateProjectRequestV2): string {
  const notes = input.common.additional_notes?.trim();
  if (notes) return notes.slice(0, 4000);

  const { topic, audience, primary_problem, desired_outcome } = input.common;
  const typeLabel = EBOOK_TYPE_LABELS[input.ebook_type];

  let line = `${typeLabel} untuk ${audience} yang ${primary_problem.toLowerCase().startsWith("sulit") || primary_problem.toLowerCase().startsWith("belum") ? primary_problem.toLowerCase() : `menghadapi: ${primary_problem}`}. Target hasil: ${desired_outcome}.`;

  if (input.business_context.type === "lead_magnet") {
    const goalLabel =
      LEAD_GOAL_LABELS[input.business_context.lead_goal as LeadGoal] ??
      input.business_context.lead_goal;
    line += ` Tujuan funnel: ${goalLabel.toLowerCase()}.`;
  } else if (input.business_context.type === "bonus_product") {
    line += ` Produk utama: ${input.business_context.parent_product}.`;
  } else if (input.business_context.type === "sellable_ebook") {
    line += ` Posisi produk: ${input.business_context.sales_positioning}.`;
  }

  // Do not include secrets or full URLs
  void topic;
  return line.slice(0, 4000);
}

function seedStrategyFromV2(input: CreateProjectRequestV2): EbookStrategy {
  const base = createEmptyProjectState(input.ebook_type).strategy;
  const tone = input.common.tone?.trim() || DEFAULT_TONE;

  base.topic = input.common.topic;
  base.audience = input.common.audience;
  base.primary_problem = input.common.primary_problem;
  base.desired_outcome = input.common.desired_outcome;
  base.tone = tone;
  // core_promise and unique_angle intentionally left null

  const ctx = input.business_context;
  if (ctx.type === "lead_magnet") {
    base.funnel_goal = LEAD_GOAL_LABELS[ctx.lead_goal] ?? ctx.lead_goal;
    base.traffic_source = ctx.traffic_source;
    base.product_or_offer = ctx.next_offer;
    base.cta_goal = ctx.post_read_action;
  } else if (ctx.type === "bonus_product") {
    base.product_or_offer = ctx.parent_product;
    base.bonus_role = ctx.bonus_role;
    base.usage_moment = ctx.usage_moment;
  } else if (ctx.type === "sellable_ebook") {
    base.sales_positioning = ctx.sales_positioning;
    base.buyer_objections = ctx.buyer_objections ?? [];
  }

  return base;
}

export function buildInitialProjectState(
  input: CreateProjectRequestV2,
): ProjectStateV3 {
  const state = createEmptyProjectState(input.ebook_type);
  state.strategy = seedStrategyFromV2(input);
  state.missing_fields = computeMissingFields(
    state.strategy,
    input.ebook_type,
  );
  state.next_action =
    state.missing_fields.length > 0 ? "continue_strategy" : "create_outline";
  return state;
}

export function mapCreateRequestToProjectInsert(
  input: CreateProjectRequestV2,
  ownerId: string,
): ProjectInsertPayload {
  const tone = input.common.tone?.trim() || DEFAULT_TONE;
  let cta_goal: CtaGoal | null = null;
  let cta_url: string | null = null;

  if (input.business_context.type === "lead_magnet") {
    cta_goal = input.business_context.post_read_action;
    const requiresUrl = (CTA_URL_REQUIRED_GOALS as CtaGoal[]).includes(
      cta_goal,
    );
    cta_url = requiresUrl
      ? input.business_context.cta_url
      : input.business_context.cta_url;
  }

  return {
    owner_id: ownerId,
    title: buildWorkingTitle({
      working_title: input.common.working_title,
      topic: input.common.topic,
      ebook_type: input.ebook_type,
    }),
    author: input.common.author,
    subtitle: null,
    description: buildProjectDescription(input),
    audience: input.common.audience,
    tone,
    niche: input.common.niche,
    ebook_type: input.ebook_type,
    template_id: input.template_id ?? null,
    status: "draft",
    progress: 0,
    sections_generated: 0,
    total_sections: 0,
    cover_color: DEFAULT_COVER_COLOR,
    cta_goal,
    cta_url,
    final_cta: null,
  };
}

export function normalizeCreateProjectV2(
  input: CreateProjectRequestV2,
  ownerId: string,
): NormalizedCreateProject {
  const projectInsert = mapCreateRequestToProjectInsert(input, ownerId);
  const initialState = buildInitialProjectState(input);
  const readinessScore = computeDeterministicReadinessScore(
    initialState.strategy,
    input.ebook_type,
  );
  return { projectInsert, initialState, readinessScore };
}

/** Convert legacy flat ProjectInput into NormalizedCreateProject. */
export function normalizeLegacyCreateProject(
  input: LegacyProjectInput,
  ownerId: string,
): NormalizedCreateProject {
  const ebookType = input.ebook_type ?? "lead_magnet";
  const state = createEmptyProjectState(ebookType);
  state.strategy.topic = input.title;
  state.strategy.audience = input.audience;
  state.strategy.tone = input.tone;
  // Minimal seed — no fabricated promise/angle/problem
  state.missing_fields = computeMissingFields(state.strategy, ebookType);

  const projectInsert: ProjectInsertPayload = {
    owner_id: ownerId,
    title: input.title.trim().slice(0, 120),
    author: input.author,
    subtitle: input.subtitle ?? null,
    description: input.description,
    audience: input.audience,
    tone: input.tone,
    niche: input.niche,
    ebook_type: ebookType,
    template_id: input.template_id ?? null,
    status: "draft",
    progress: 0,
    sections_generated: 0,
    total_sections: 0,
    cover_color: DEFAULT_COVER_COLOR,
    cta_goal: null,
    cta_url: null,
    final_cta: null,
  };

  const readinessScore = computeDeterministicReadinessScore(
    state.strategy,
    ebookType,
  );

  return { projectInsert, initialState: state, readinessScore };
}
