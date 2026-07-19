import { requireOwnedProject } from "@/lib/api/project-access";
import { jsonError } from "@/lib/api/errors";
import {
  normalizeProjectState,
  mergeProjectState,
  createEmptyProjectState,
  clampReadinessScore,
  computeDeterministicReadinessScore,
} from "@/lib/project-state/normalize";
import { strategyPatchSchema } from "@/lib/validations/strategy";
import { getSupabaseErrorMessage } from "@/lib/api/supabase-result";
import type { ProjectStateV2, EbookStrategy } from "@/types/strategy";

// Re-export for unit tests / shared consumers
export { strategyPatchSchema } from "@/lib/validations/strategy";

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

  const { data: stateRow, error: stateErr } = await supabase
    .from("project_states")
    .select("state_json, readiness_score")
    .eq("project_id", id)
    .maybeSingle();

  if (stateErr) {
    return jsonError(
      getSupabaseErrorMessage(stateErr, "Failed to load project state"),
      500,
      "db_error",
    );
  }

  const state = stateRow?.state_json
    ? normalizeProjectState(stateRow.state_json)
    : createEmptyProjectState();
  const readinessScore = clampReadinessScore(stateRow?.readiness_score);

  return strategyResponse(state, readinessScore);
}

// ---------------------------------------------------------------------------
// PATCH /api/projects/[id]/strategy
// ---------------------------------------------------------------------------

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

  const { data: stateRow, error: stateErr } = await supabase
    .from("project_states")
    .select("state_json, readiness_score")
    .eq("project_id", id)
    .maybeSingle();

  if (stateErr) {
    return jsonError(
      getSupabaseErrorMessage(stateErr, "Failed to load project state"),
      500,
      "db_error",
    );
  }

  const currentState = stateRow?.state_json
    ? normalizeProjectState(stateRow.state_json)
    : createEmptyProjectState();

  // Merge safely: treat patch as a StrategistResult with only state_patch
  const merged = mergeProjectState(currentState, {
    assistant_message: "", // not used
    state_patch: strategy_patch as Partial<EbookStrategy>,
    readiness_score: 0, // recalculated deterministically below
    missing_fields: [], // recomputed by mergeProjectState
    next_action: currentState.next_action,
  });

  // Manual edits must not leave readiness stuck below the outline gate.
  const readinessScore = computeDeterministicReadinessScore(merged.strategy);

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
    return jsonError(
      getSupabaseErrorMessage(upsertErr, "Failed to persist state"),
      500,
      "db_error",
    );
  }

  return strategyResponse(merged, readinessScore);
}
