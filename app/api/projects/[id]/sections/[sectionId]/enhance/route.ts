import { z } from "zod";
import { requireOwnedProject } from "@/lib/api/project-access";
import { jsonError } from "@/lib/api/errors";
import { chargeGeneration, grantCredits } from "@/lib/credits";
import { CREDIT_COSTS } from "@/lib/billing/plans";
import { runEnhancement } from "@/lib/ai/agents/enhancement";
import type { EnhancementAction } from "@/types/ai-suggestions";

/** Enhancement actions supported by the API. */
const ENHANCEMENT_ACTIONS: EnhancementAction[] = [
  "expand",
  "shorten",
  "simplify",
  "persuasive",
  "professional",
  "add_examples",
  "add_checklist",
];

const enhanceBodySchema = z.object({
  action: z.enum(ENHANCEMENT_ACTIONS as [string, ...string[]]),
  selection_html: z.string().nullable().optional(),
  instruction: z.string().nullable().optional(),
});

/**
 * Non-destructive section enhancement agent.
 *
 * This endpoint generates an `EnhancementSuggestion` without modifying the
 * persisted section.  The caller (front-end) is responsible for applying the
 * suggestion via the existing section-update endpoint (Task 9).
 */
export async function POST(
  _req: Request,
  ctx: { params: Promise<{ id: string; sectionId: string }> },
) {
  let charged = false;
  let userId: string | null = null;
  try {
    const { id, sectionId } = await ctx.params;
    const access = await requireOwnedProject(id);
    if ("error" in access && access.error) return access.error;
    const { supabase, user } = access;
    userId = user.id;

    // ---- Load section ----

    const { data: section, error: sectionError } = await supabase
      .from("ebook_sections")
      .select("*")
      .eq("id", sectionId)
      .eq("project_id", id)
      .maybeSingle();

    if (sectionError)
      return jsonError(sectionError.message, 500, "db_error");
    if (!section)
      return jsonError("Section not found", 404, "not_found");

    // ---- Parse body ----

    let body: unknown;
    try {
      body = await _req.json();
    } catch {
      return jsonError("Invalid JSON body", 400, "invalid_body");
    }

    const parseResult = enhanceBodySchema.safeParse(body);
    if (!parseResult.success) {
      return jsonError(
        `Invalid request: ${parseResult.error.issues.map((i) => i.message).join("; ")}`,
        400,
        "validation_error",
      );
    }

    const { action, selection_html, instruction } = parseResult.data;

    // ---- Charge credits ----

    try {
      await chargeGeneration(user.id, "enhancement", id);
      charged = true;
    } catch (err) {
      const e = err as Error & { code?: string };
      if (e.code === "insufficient_credits") {
        return jsonError(e.message, 402, "insufficient_credits");
      }
      throw err;
    }

    // ---- Run enhancement ----

    const contentHtml = String(section.content_html ?? "");

    const suggestion = await runEnhancement({
      action: action as EnhancementAction,
      content_html: contentHtml,
      selection_html: selection_html ?? null,
      instruction: instruction ?? null,
      section: {
        title: section.title ?? undefined,
      },
    });

    // ---- Return suggestion (do NOT persist to ebook_sections) ----

    return Response.json({ suggestion });
  } catch (err) {
    // ---- Refund on failure ----
    if (charged && userId) {
      await grantCredits({
        userId,
        amount: CREDIT_COSTS.enhancement,
        type: "refund",
        label: "Refund enhancement failure",
      }).catch(() => null);
    }
    const message = err instanceof Error ? err.message : "Server error";
    return jsonError(message, 503, "unavailable");
  }
}
