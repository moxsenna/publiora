import { requireOwnedProject } from "@/lib/api/project-access";
import { jsonError } from "@/lib/api/errors";
import { runPlanner } from "@/lib/ai/agents/planner";
import { chargeGeneration, grantCredits } from "@/lib/credits";
import { CREDIT_COSTS } from "@/lib/billing/plans";
import type { Outline } from "@/types/outline";

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
  _req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  let charged = false;
  let userId: string | null = null;

  try {
    const { id } = await ctx.params;
    const access = await requireOwnedProject(id);
    if ("error" in access && access.error) return access.error;

    const { supabase, user, project } = access;
    userId = user.id;

    const { data: existing } = await supabase
      .from("outlines")
      .select("id")
      .eq("project_id", id)
      .maybeSingle();

    if (existing) {
      return jsonError(
        "Outline already exists. Edit it instead.",
        409,
        "conflict"
      );
    }

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

    const planned = await runPlanner({
      title: project.title,
      description: project.description,
      audience: project.audience,
      tone: project.tone,
      niche: project.niche,
    });

    const now = new Date().toISOString();
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
        "db_error"
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
