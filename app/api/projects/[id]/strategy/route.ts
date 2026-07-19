import { z } from "zod";
import { requireOwnedProject } from "@/lib/api/project-access";
import { jsonError } from "@/lib/api/errors";
import {
  normalizeProjectState,
  mergeProjectState,
  createEmptyProjectState,
  clampReadinessScore,
} from "@/lib/project-state/normalize";
import type { ProjectStateV2, EbookStrategy } from "@/types/strategy";

// ---------------------------------------------------------------------------
// Shared response helper
// ---------------------------------------------------------------------------

function strategyResponse(state: ProjectStateV2, readinessScore: number) {
  return Response.json({
    state,
    readiness_score: readinessScore,
  });
}

// ---------------------------------------------------------------------------
// GET /api/projects/[id]/strategy
// ---------------------------------------------------------------------------

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  const access = await requireOwnedProject(id);
  if ("error" in access && access.error) return access.error;

  const { supabase } = access;

  let state: ProjectStateV2;
  let readinessScore = 0;

  try {
    const { data: stateRow } = await supabase
      .from("project_states")
      .select("state_json, readiness_score")
      .eq("project_id", id)
      .maybeSingle();

    if (stateRow?.state_json) {
      state = normalizeProjectState(stateRow.state_json);
    } else {
      state = createEmptyProjectState();
    }
    readinessScore = clampReadinessScore(stateRow?.readiness_score);
  } catch {
    return jsonError("Failed to load project state", 500, "db_error");
  }

  return strategyResponse(state, readinessScore);
}

// ---------------------------------------------------------------------------
// PATCH /api/projects/[id]/strategy
// ---------------------------------------------------------------------------

const strategyPatchSchema = z.object({
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
    })
    .strict(),
});

export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  const access = await requireOwnedProject(id);
  if ("error" in access && access.error) return access.error;

  const { supabase } = access;

  // Parse request
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return jsonError("Invalid JSON body", 400, "invalid_body");
  }
  const validation = strategyPatchSchema.safeParse(body);
  if (!validation.success) {
    const firstIssue = validation.error.issues[0];
    return jsonError(
      firstIssue?.message ?? "validation error",
      400,
      "validation_error",
    );
  }

  const { strategy_patch } = validation.data;

  // Load current state
  let currentState: ProjectStateV2;
  let readinessScore = 0;
  try {
    const { data: stateRow } = await supabase
      .from("project_states")
      .select("state_json, readiness_score")
      .eq("project_id", id)
      .maybeSingle();

    if (stateRow?.state_json) {
      currentState = normalizeProjectState(stateRow.state_json);
    } else {
      currentState = createEmptyProjectState();
    }
    readinessScore = clampReadinessScore(stateRow?.readiness_score);
  } catch {
    return jsonError("Failed to load project state", 500, "db_error");
  }

  // Merge safely: treat patch as a StrategistResult with only state_patch
  const merged = mergeProjectState(currentState, {
    assistant_message: "", // not used
    state_patch: strategy_patch as Partial<EbookStrategy>,
    readiness_score: readinessScore,
    missing_fields: [], // recomputed by mergeProjectState anyway
    next_action: currentState.next_action,
  });

  // Persist merged state (keep existing readiness_score — no AI, no score change)
  try {
    const { error: upsertErr } = await supabase.from("project_states").upsert(
      {
        project_id: id,
        state_json: merged,
        readiness_score: readinessScore,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "project_id" },
    );
    if (upsertErr) {
      return jsonError(upsertErr.message, 500, "db_error");
    }
  } catch {
    return jsonError("Failed to persist state", 500, "db_error");
  }

  return strategyResponse(merged, readinessScore);
}
