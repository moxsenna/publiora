import { requireOwnedProject } from "@/lib/api/project-access";
import { jsonError } from "@/lib/api/errors";
import { runTitleGenerator } from "@/lib/ai/agents/title";
import { chargeGeneration, grantCredits } from "@/lib/credits";
import { normalizeProjectState } from "@/lib/project-state/normalize";
import { CREDIT_COSTS } from "@/lib/billing/plans";

export async function POST(
  _req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  let charged = false;
  let userId: string | null = null;
  let projectId: string | null = null;
  try {
    const { id } = await ctx.params;
    projectId = id;
    const access = await requireOwnedProject(id);
    if ("error" in access && access.error) return access.error;

    const { supabase, user, project } = access;
    userId = user.id;

    // ---- Load strategy state for richer title context ----
    let strategy = null;
    try {
      const { data: stateRow } = await supabase
        .from("project_states")
        .select("state_json")
        .eq("project_id", id)
        .maybeSingle();

      if (stateRow?.state_json) {
        const normalized = normalizeProjectState(stateRow.state_json);
        strategy = normalized.strategy;
      }
    } catch {
      // Strategy load is optional — proceed without it
    }

    // ---- Charge credits ----
    try {
      await chargeGeneration(user.id, "title", id);
      charged = true;
    } catch (err) {
      const e = err as Error & { code?: string };
      if (e.code === "insufficient_credits") {
        return jsonError(e.message, 402, "insufficient_credits");
      }
      throw err;
    }

    const suggestions = await runTitleGenerator({
      project: {
        title: project.title,
        description: project.description,
        audience: project.audience,
        tone: project.tone,
        ebook_type: project.ebook_type,
      },
      strategy,
    });

    return Response.json({ suggestions });
  } catch (err) {
    if (charged && userId) {
      await grantCredits({
        userId,
        amount: CREDIT_COSTS.title,
        type: "refund",
        label: "Refund title generate failure",
        meta: projectId ? { project_id: projectId } : undefined,
      }).catch(() => null);
    }
    const message = err instanceof Error ? err.message : "Server error";
    return jsonError(message, 503, "unavailable");
  }
}
