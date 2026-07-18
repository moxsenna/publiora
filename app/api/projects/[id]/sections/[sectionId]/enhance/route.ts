import { requireOwnedProject } from "@/lib/api/project-access";
import { jsonError } from "@/lib/api/errors";
import { sanitizeHtml } from "@/lib/sanitize";
import { chargeGeneration, grantCredits } from "@/lib/credits";
import { CREDIT_COSTS } from "@/lib/billing/plans";
import { completeJson } from "@/lib/ai/provider";

/** Light enhancement agent: polish HTML of one section (costs same as title=2). */
export async function POST(
  _req: Request,
  ctx: { params: Promise<{ id: string; sectionId: string }> }
) {
  let charged = false;
  let userId: string | null = null;
  try {
    const { id, sectionId } = await ctx.params;
    const access = await requireOwnedProject(id);
    if ("error" in access && access.error) return access.error;
    const { supabase, user } = access;
    userId = user.id;

    const { data: section, error } = await supabase
      .from("ebook_sections")
      .select("*")
      .eq("id", sectionId)
      .eq("project_id", id)
      .maybeSingle();
    if (error) return jsonError(error.message, 500, "db_error");
    if (!section) return jsonError("Section not found", 404, "not_found");

    try {
      // reuse title cost bucket for light polish
      await chargeGeneration(user.id, "title", id);
      charged = true;
    } catch (err) {
      const e = err as Error & { code?: string };
      if (e.code === "insufficient_credits") {
        return jsonError(e.message, 402, "insufficient_credits");
      }
      throw err;
    }

    const original = String(section.content_html ?? "");
    const result = await completeJson<{ content_html: string }>({
      system:
        "You polish marketing ebook HTML. Keep structure, improve clarity, keep language. Return JSON { content_html } only. No script tags.",
      user: `Polish this HTML:\n${original.slice(0, 12000)}`,
    });
    if (!result.content_html?.trim()) {
      throw new Error("Enhancement returned empty content_html");
    }
    let content_html = result.content_html;

    content_html = sanitizeHtml(content_html);
    const word_count = content_html
      .replace(/<[^>]+>/g, " ")
      .split(/\s+/)
      .filter(Boolean).length;

    const { data: updated, error: upErr } = await supabase
      .from("ebook_sections")
      .update({
        content_html,
        word_count,
        status: "edited",
        updated_at: new Date().toISOString(),
      })
      .eq("id", sectionId)
      .select("*")
      .single();

    if (upErr) {
      if (charged && userId) {
        await grantCredits({
          userId,
          amount: CREDIT_COSTS.title,
          type: "refund",
          label: "Refund enhancement failure",
          meta: { project_id: id, section_id: sectionId },
        }).catch(() => null);
      }
      return jsonError(upErr.message, 500, "db_error");
    }

    return Response.json(updated);
  } catch (err) {
    if (charged && userId) {
      await grantCredits({
        userId,
        amount: CREDIT_COSTS.title,
        type: "refund",
        label: "Refund enhancement failure",
      }).catch(() => null);
    }
    const message = err instanceof Error ? err.message : "Server error";
    return jsonError(message, 503, "unavailable");
  }
}
