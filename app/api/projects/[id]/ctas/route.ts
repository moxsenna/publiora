import { requireOwnedProject } from "@/lib/api/project-access";
import { jsonError } from "@/lib/api/errors";
import { runCtaGenerator } from "@/lib/ai/agents/cta";
import { chargeGeneration, grantCredits } from "@/lib/credits";
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

    const { user, project } = access;
    userId = user.id;
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

    const ctas = await runCtaGenerator({
      title: project.title,
      audience: project.audience,
    });
    return Response.json(ctas);
  } catch (err) {
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
