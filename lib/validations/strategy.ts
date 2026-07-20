import { z } from "zod";

// ---------------------------------------------------------------------------
// POST /api/projects/[id]/chat
// ---------------------------------------------------------------------------

export const chatBodySchema = z.object({
  content: z
    .string()
    .trim()
    .min(1, "content is required")
    .max(4000, "content too long"),
});

export type ChatBody = z.infer<typeof chatBodySchema>;

// ---------------------------------------------------------------------------
// PATCH /api/projects/[id]/strategy
// ---------------------------------------------------------------------------

export const strategyPatchSchema = z.object({
  strategy_patch: z
    .object({
      topic: z.string().trim().nullable().optional(),
      audience: z.string().trim().nullable().optional(),
      audience_sophistication: z.string().trim().nullable().optional(),
      primary_problem: z.string().trim().nullable().optional(),
      pain_points: z.array(z.string().trim()).optional(),
      desired_outcome: z.string().trim().nullable().optional(),
      core_promise: z.string().trim().nullable().optional(),
      unique_angle: z.string().trim().nullable().optional(),
      content_pillars: z.array(z.string().trim()).optional(),
      product_or_offer: z.string().trim().nullable().optional(),
      funnel_goal: z.string().trim().nullable().optional(),
      cta_goal: z.string().trim().nullable().optional(),
      tone: z.string().trim().nullable().optional(),
      traffic_source: z.string().trim().nullable().optional(),
      bonus_role: z.string().trim().nullable().optional(),
      usage_moment: z.string().trim().nullable().optional(),
      sales_positioning: z.string().trim().nullable().optional(),
      buyer_objections: z.array(z.string().trim()).optional(),
    })
    .strict(),
});

export type StrategyPatchBody = z.infer<typeof strategyPatchSchema>;
