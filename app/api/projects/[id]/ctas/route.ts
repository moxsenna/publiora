import { z } from "zod";
import { requireOwnedProject } from "@/lib/api/project-access";
import { jsonError } from "@/lib/api/errors";
import { runCtaGenerator } from "@/lib/ai/agents/cta";
import { chargeGeneration, grantCredits } from "@/lib/credits";
import { normalizeProjectState } from "@/lib/project-state/normalize";
import { CREDIT_COSTS } from "@/lib/billing/plans";
import {
  CTA_URL_REQUIRED_GOALS,
  isValidCtaUrl,
  type CtaGenerateRequest,
} from "@/types/ai-suggestions";
import type { EbookStrategy } from "@/types/strategy";
import { getSupabaseErrorMessage } from "@/lib/api/supabase-result";

// ---------------------------------------------------------------------------
// Request body schema
// ---------------------------------------------------------------------------

const ctaRequestBodySchema = z.object({
  goal: z.enum([
    "visit_product",
    "join_whatsapp",
    "claim_bonus",
    "buy_product",
    "follow_creator",
    "custom",
  ]),
  destination_url: z
    .union([z.string().url(), z.literal(""), z.null()])
    .transform((v) => (v === "" ? null : v))
    .optional()
    .default(null),
  placement: z.enum(["ebook_end", "claim_page", "both"]).optional().default("ebook_end"),
  custom_instruction: z.string().optional().nullable().default(null),
});

// ---------------------------------------------------------------------------
// POST /api/projects/[id]/ctas
// ---------------------------------------------------------------------------

export async function POST(
  req: Request,
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

    // ---- Parse request body ----
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return jsonError("Invalid JSON body", 400, "invalid_body");
    }

    const parsed = ctaRequestBodySchema.safeParse(body);
    if (!parsed.success) {
      const firstIssue = parsed.error.issues[0];
      return jsonError(
        firstIssue?.message ?? "validation error",
        400,
        "validation_error",
      );
    }

    const request: CtaGenerateRequest = parsed.data;

    // Validate URL-required goals before charging credits
    if (
      (CTA_URL_REQUIRED_GOALS as readonly string[]).includes(request.goal) &&
      (request.destination_url == null ||
        !isValidCtaUrl(request.destination_url))
    ) {
      return jsonError(
        "A valid http(s) destination_url is required for this CTA goal",
        400,
        "validation_error",
      );
    }

    // ---- Load strategy state for richer CTA context ----
    let strategy: EbookStrategy | null = null;
    const { data: stateRow, error: stateErr } = await supabase
      .from("project_states")
      .select("state_json")
      .eq("project_id", id)
      .maybeSingle();
    if (stateErr) {
      return jsonError(
        getSupabaseErrorMessage(stateErr, "Failed to load strategy state"),
        500,
        "db_error",
      );
    }
    if (stateRow?.state_json) {
      strategy = normalizeProjectState(stateRow.state_json).strategy;
    }

    // ---- Charge credits ----
    try {
      await chargeGeneration(user.id, "cta", id);
      charged = true;
    } catch (err) {
      const e = err as Error & { code?: string };
      if (e.code === "insufficient_credits") {
        return jsonError(e.message, 402, "insufficient_credits");
      }
      throw err;
    }

    // ---- Generate CTAs ----
    const result = await runCtaGenerator({
      request,
      project: {
        title: project.title,
        audience: project.audience,
        tone: project.tone,
        ebook_type: project.ebook_type,
      },
      strategy,
    });

    return Response.json(result);
  } catch (err) {
    // ---- Refund on failure ----
    if (charged && userId) {
      await grantCredits({
        userId,
        amount: CREDIT_COSTS.cta,
        type: "refund",
        label: "Refund CTA generate failure",
        meta: projectId ? { project_id: projectId } : undefined,
      }).catch(() => null);
    }
    const message = err instanceof Error ? err.message : "Server error";
    return jsonError(message, 503, "unavailable");
  }
}
