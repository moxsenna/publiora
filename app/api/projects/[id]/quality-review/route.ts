import { requireOwnedProject } from "@/lib/api/project-access";
import { jsonError } from "@/lib/api/errors";
import { runQualityReviewer } from "@/lib/ai/agents/reviewer";
import { chargeGeneration, grantCredits } from "@/lib/credits";
import { CREDIT_COSTS } from "@/lib/billing/plans";
import {
  createEmptyProjectState,
  normalizeProjectState,
} from "@/lib/project-state/normalize";
import { resolveFormatContext } from "@/lib/templates/format-context";
import { loadPrimaryProjectOfferContext } from "@/lib/offers/project-offer-context";
import type { OutlineSection } from "@/types/outline";

export async function POST(
  _req: Request,
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

    const ebookType =
      project.ebook_type === "bonus_product" ||
      project.ebook_type === "sellable_ebook" ||
      project.ebook_type === "lead_magnet"
        ? project.ebook_type
        : "lead_magnet";

    const { data: stateRow } = await supabase
      .from("project_states")
      .select("state_json")
      .eq("project_id", id)
      .maybeSingle();
    const strategyState = stateRow?.state_json
      ? normalizeProjectState(stateRow.state_json, ebookType)
      : createEmptyProjectState(ebookType);

    const { data: outlineRow } = await supabase
      .from("outlines")
      .select("sections")
      .eq("project_id", id)
      .maybeSingle();
    const outlineSections = (outlineRow?.sections as OutlineSection[]) ?? [];

    const { data: sectionRows } = await supabase
      .from("ebook_sections")
      .select("id, outline_section_id, title, content_html, word_count")
      .eq("project_id", id)
      .order("position", { ascending: true });

    try {
      await chargeGeneration(user.id, "quality_review", id);
      charged = true;
    } catch (err) {
      const e = err as Error & { code?: string };
      if (e.code === "insufficient_credits") {
        return jsonError(e.message, 402, "insufficient_credits");
      }
      throw err;
    }

    const offer_context = await loadPrimaryProjectOfferContext({
      supabase,
      projectId: id,
      ownerId: user.id,
    });

    const result = await runQualityReviewer({
      project: {
        title: project.title,
        audience: project.audience,
        tone: project.tone,
        niche: project.niche,
        ebook_type: ebookType,
      },
      strategy: strategyState.strategy,
      format_context: resolveFormatContext({
        ebookType,
        templateId: (project.template_id as string | null) ?? null,
      }),
      outline_sections: outlineSections.map((s) => ({
        id: s.id,
        title: s.title,
        summary: s.summary,
        position: s.position,
      })),
      sections: (sectionRows ?? []).map((s) => ({
        id: String(s.id),
        outline_section_id: String(s.outline_section_id),
        title: String(s.title),
        content_html: String(s.content_html ?? ""),
        word_count: Number(s.word_count ?? 0),
      })),
      offer_context,
    });

    return Response.json({
      ...result,
      cost: CREDIT_COSTS.quality_review,
    });
  } catch (err) {
    if (charged && userId) {
      await grantCredits({
        userId,
        amount: CREDIT_COSTS.quality_review,
        type: "refund",
        label: "Refund quality review failure",
      }).catch(() => null);
    }
    const message = err instanceof Error ? err.message : "Server error";
    return jsonError(message, 503, "unavailable");
  }
}
