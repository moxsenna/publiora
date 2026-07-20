// Normalize create-project requests into project insert + initial Strategy V3.

import {
  type CreateProjectRequestV2,
  type CreateProjectRequestV3,
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
import type { ProjectOfferRelationship } from "@/types/offer";

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

export interface NormalizedCreateProjectV3 extends NormalizedCreateProject {
  offerLink:
    | {
        mode: "none";
      }
    | {
        mode: "existing";
        offer_id: string;
        relationship: ProjectOfferRelationship;
      }
    | {
        mode: "quick_create";
        offer: {
          name: string;
          offer_type: string;
          ownership: string;
          destination_url: string | null;
          short_description: string | null;
          target_audience: string | null;
          primary_outcome: string | null;
          niche: string | null;
        };
        relationship: ProjectOfferRelationship;
      };
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

function mapLeadGoalToCta(goal: LeadGoal): CtaGoal | null {
  switch (goal) {
    case "join_whatsapp":
      return "join_whatsapp";
    case "visit_offer":
      return "visit_product";
    case "book_call":
    case "webinar_registration":
    case "start_trial":
      return "custom";
    case "collect_email":
      return "follow_creator";
    default:
      return "custom";
  }
}

export function normalizeCreateProjectV3(
  input: CreateProjectRequestV3,
  ownerId: string,
  offerPrefill?: {
    name?: string | null;
    target_audience?: string | null;
    primary_problem?: string | null;
    niche?: string | null;
    destination_url?: string | null;
  } | null,
): NormalizedCreateProjectV3 {
  const tone = input.common.tone?.trim() || DEFAULT_TONE;
  const idea = input.common.idea_text?.trim() || null;
  const topic =
    input.common.topic?.trim() ||
    idea?.slice(0, 200) ||
    input.common.working_title?.trim() ||
    EBOOK_TYPE_LABELS[input.ebook_type];

  const audience =
    input.common.audience?.trim() ||
    offerPrefill?.target_audience?.trim() ||
    "";
  const primary_problem =
    input.common.primary_problem?.trim() ||
    offerPrefill?.primary_problem?.trim() ||
    "";
  const desired_outcome = input.common.desired_outcome?.trim() || "";
  const niche =
    input.common.niche?.trim() || offerPrefill?.niche?.trim() || "";

  let cta_goal: CtaGoal | null = null;
  let cta_url: string | null = null;

  if (input.business_context.type === "lead_magnet") {
    cta_goal =
      input.business_context.post_read_action ??
      mapLeadGoalToCta(input.business_context.lead_goal);
    cta_url =
      input.business_context.cta_url ??
      offerPrefill?.destination_url ??
      null;
  } else {
    cta_url = offerPrefill?.destination_url ?? null;
  }

  const productName =
    offerPrefill?.name ??
    (input.offer_context.mode === "quick_create"
      ? input.offer_context.offer.name
      : null);

  const state = createEmptyProjectState(input.ebook_type);
  state.strategy.topic = topic;
  state.strategy.audience = audience || null;
  state.strategy.primary_problem = primary_problem || null;
  state.strategy.desired_outcome = desired_outcome || null;
  state.strategy.tone = tone;

  if (input.business_context.type === "lead_magnet") {
    state.strategy.funnel_goal =
      LEAD_GOAL_LABELS[input.business_context.lead_goal] ??
      input.business_context.lead_goal;
    state.strategy.traffic_source =
      input.business_context.traffic_source ?? null;
    state.strategy.product_or_offer = productName;
    state.strategy.cta_goal = cta_goal;
  } else if (input.business_context.type === "bonus_product") {
    state.strategy.product_or_offer = productName;
    state.strategy.bonus_role = input.business_context.bonus_role ?? null;
    state.strategy.usage_moment = input.business_context.usage_moment ?? null;
    if (input.business_context.bonus_intent) {
      state.strategy.desired_outcome =
        state.strategy.desired_outcome || input.business_context.bonus_intent;
    }
  } else if (input.business_context.type === "sellable_ebook") {
    const pos = input.business_context.sales_positioning;
    state.strategy.sales_positioning =
      pos === "standalone"
        ? "core_product"
        : pos === "entry_to_offer"
          ? "entry_product"
          : "bundle_component";
    state.strategy.buyer_objections =
      input.business_context.buyer_objections ?? [];
    if (productName && pos !== "standalone") {
      state.strategy.product_or_offer = productName;
    }
  }

  state.missing_fields = computeMissingFields(state.strategy, input.ebook_type);
  state.next_action =
    state.missing_fields.length > 0 ? "continue_strategy" : "create_outline";

  const notes = input.common.additional_notes?.trim();
  let description =
    notes ||
    idea ||
    `${EBOOK_TYPE_LABELS[input.ebook_type]}${audience ? ` untuk ${audience}` : ""}${productName ? ` · terkait ${productName}` : ""}`;
  description = description.slice(0, 4000);

  const projectInsert: ProjectInsertPayload = {
    owner_id: ownerId,
    title: buildWorkingTitle({
      working_title: input.common.working_title,
      topic,
      ebook_type: input.ebook_type,
    }),
    author: input.common.author,
    subtitle: null,
    description,
    audience: audience || "Akan dilengkapi di Strategy",
    tone,
    niche: niche || "Umum",
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

  const readinessScore = computeDeterministicReadinessScore(
    state.strategy,
    input.ebook_type,
  );

  let offerLink: NormalizedCreateProjectV3["offerLink"] = { mode: "none" };
  if (input.offer_context.mode === "existing") {
    offerLink = {
      mode: "existing",
      offer_id: input.offer_context.offer_id,
      relationship: input.offer_context.relationship,
    };
  } else if (input.offer_context.mode === "quick_create") {
    offerLink = {
      mode: "quick_create",
      offer: {
        name: input.offer_context.offer.name,
        offer_type: input.offer_context.offer.offer_type,
        ownership: input.offer_context.offer.ownership,
        destination_url: input.offer_context.offer.destination_url ?? null,
        short_description:
          input.offer_context.offer.short_description ?? null,
        target_audience: input.offer_context.offer.target_audience ?? null,
        primary_outcome: input.offer_context.offer.primary_outcome ?? null,
        niche: input.offer_context.offer.niche ?? null,
      },
      relationship: input.offer_context.relationship,
    };
  }

  return {
    projectInsert,
    initialState: state,
    readinessScore,
    offerLink,
  };
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
