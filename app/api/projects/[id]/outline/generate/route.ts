import { requireOwnedProject } from "@/lib/api/project-access";
import { jsonError } from "@/lib/api/errors";
import { runPlanner } from "@/lib/ai/agents/planner";
import { chargeGeneration, grantCredits } from "@/lib/credits";
import { CREDIT_COSTS } from "@/lib/billing/plans";
import {
  isStrategyReady,
  getStrategyBlockers,
} from "@/lib/workflow/project-workflow";
import {
  normalizeProjectState,
  createEmptyProjectState,
  clampReadinessScore,
  computeMissingFields,
} from "@/lib/project-state/normalize";
import type { Outline, OutlineGenerateInput } from "@/types/outline";

function mapOutline(row: Record<string, unknown>): Outline {
  return {
    id: String(row.id),
    project_id: String(row.project_id),
    title: String(row.title ?? ""),
    description: String(row.description ?? ""),
    sections: (row.sections as Outline["sections"]) ?? [],
    approved: Boolean(row.approved),
    approved_at: (row.approved_at as string) ?? null,
    created_at: String(row.created_at),
    updated_at: String(row.updated_at),
  };
}

export async function POST(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  let charged = false;
  let userId: string | null = null;

  try {
    const { id } = await ctx.params;
    const access = await requireOwnedProject(id);
    if ("error" in access && access.error) return access.error;

    const { supabase, user, project } = access;
    userId = user.id;

    // ---- Parse body ----

    let body: OutlineGenerateInput;
    try {
      body = await req.json();
    } catch {
      body = {} as OutlineGenerateInput;
    }
    // Normalize: prefer user_instruction, fall back to angle (deprecated)
    const userInstruction = body.user_instruction ?? body.angle ?? undefined;
    const confirmReset = body.confirm_reset_written_sections === true;

    // ---- Load strategy state ----

    let strategyState;
    let readinessScore: number;

    try {
      const { data: stateRow } = await supabase
        .from("project_states")
        .select("state_json, readiness_score")
        .eq("project_id", id)
        .maybeSingle();

      if (stateRow?.state_json) {
        strategyState = normalizeProjectState(stateRow.state_json);
      } else {
        strategyState = createEmptyProjectState();
      }
      readinessScore = clampReadinessScore(stateRow?.readiness_score);
    } catch {
      return jsonError("Failed to load project state", 500, "db_error");
    }

    // ---- Strategy readiness gate ----

    const strategy = strategyState.strategy;
    const ready = isStrategyReady(strategy, readinessScore);

    if (!ready) {
      const blockers = getStrategyBlockers(strategy, readinessScore);
      return jsonError(
        "Strategy not ready for outline generation",
        409,
        "strategy_not_ready",
        {
          blockers,
          missing_fields: computeMissingFields(strategy),
          readiness_score: readinessScore,
        },
      );
    }

    // ---- Check for existing outline & written sections ----

    const { data: existingOutline } = await supabase
      .from("outlines")
      .select("*")
      .eq("project_id", id)
      .maybeSingle();

    if (existingOutline) {
      // Outline exists — check if ebook_sections with non-empty content exist
      const { data: writtenSections } = await supabase
        .from("ebook_sections")
        .select("id")
        .eq("project_id", id)
        .not("content_html", "is", null)
        .not("content_html", "eq", "")
        .limit(1);

      const hasWrittenContent =
        writtenSections && writtenSections.length > 0;

      if (hasWrittenContent && !confirmReset) {
        return jsonError(
          "This outline already has written section content. " +
            "To regenerate the outline and discard all written content, " +
            "set confirm_reset_written_sections: true.",
          409,
          "outline_regenerate_blocked",
          {
            has_written_sections: true,
            section_count_warning:
              "Regenerating the outline will permanently delete all existing section content.",
          },
        );
      }

      // Safe regeneration path: delete written sections if confirmed
      if (hasWrittenContent && confirmReset) {
        await supabase
          .from("ebook_sections")
          .delete()
          .eq("project_id", id);
      }
    }

    // ---- Charge credits ----

    try {
      await chargeGeneration(user.id, "outline", id);
      charged = true;
    } catch (err) {
      const e = err as Error & { code?: string };
      if (e.code === "insufficient_credits") {
        return jsonError(e.message, 402, "insufficient_credits");
      }
      throw err;
    }

    // ---- Run planner ----

    const planned = await runPlanner({
      project: {
        title: project.title,
        subtitle: project.subtitle,
        description: project.description,
        audience: project.audience,
        niche: project.niche,
        tone: project.tone,
        ebook_type: project.ebook_type,
      },
      strategy,
      readinessScore,
      userInstruction,
    });

    // ---- Persist outline ----

    const now = new Date().toISOString();

    if (existingOutline) {
      // Update existing outline (regeneration)
      const { data: updatedRow, error: updateErr } = await supabase
        .from("outlines")
        .update({
          title: planned.title,
          description: planned.description,
          sections: planned.sections,
          approved: false,
          approved_at: null,
          updated_at: now,
        })
        .eq("project_id", id)
        .select("*")
        .single();

      if (updateErr || !updatedRow) {
        if (charged && userId) {
          await grantCredits({
            userId,
            amount: CREDIT_COSTS.outline,
            type: "refund",
            label: "Refund outline regenerate failure",
            meta: { project_id: id },
          }).catch(() => null);
        }
        return jsonError(
          updateErr?.message ?? "Failed to update outline",
          500,
          "db_error",
        );
      }

      await supabase
        .from("projects")
        .update({
          status: "outline_draft",
          total_sections: planned.sections.length,
          updated_at: now,
        })
        .eq("id", id);

      return Response.json(mapOutline(updatedRow));
    }

    // Insert new outline
    const { data: outlineRow, error: insertErr } = await supabase
      .from("outlines")
      .insert({
        project_id: id,
        title: planned.title,
        description: planned.description,
        sections: planned.sections,
        approved: false,
        approved_at: null,
      })
      .select("*")
      .single();

    if (insertErr || !outlineRow) {
      if (charged && userId) {
        await grantCredits({
          userId,
          amount: CREDIT_COSTS.outline,
          type: "refund",
          label: "Refund outline generate failure",
          meta: { project_id: id },
        }).catch(() => null);
      }
      return jsonError(
        insertErr?.message ?? "Failed to save outline",
        500,
        "db_error",
      );
    }

    await supabase
      .from("projects")
      .update({
        status: "outline_draft",
        total_sections: planned.sections.length,
        updated_at: now,
      })
      .eq("id", id);

    return Response.json(mapOutline(outlineRow));
  } catch (err) {
    if (charged && userId) {
      await grantCredits({
        userId,
        amount: CREDIT_COSTS.outline,
        type: "refund",
        label: "Refund outline generate failure",
      }).catch(() => null);
    }
    const message = err instanceof Error ? err.message : "Server error";
    return jsonError(message, 503, "unavailable");
  }
}
