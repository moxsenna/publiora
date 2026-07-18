import { requireOwnedProject } from "@/lib/api/project-access";
import { jsonError } from "@/lib/api/errors";
import { runTitleGenerator } from "@/lib/ai/agents/title";
import { chargeGeneration } from "@/lib/credits";

export async function POST(
  _req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await ctx.params;
    const access = await requireOwnedProject(id);
    if ("error" in access && access.error) return access.error;

    const { user, project } = access;
    try {
      await chargeGeneration(user.id, "title", id);
    } catch (err) {
      const e = err as Error & { code?: string };
      if (e.code === "insufficient_credits") {
        return jsonError(e.message, 402, "insufficient_credits");
      }
      throw err;
    }

    const titles = await runTitleGenerator({
      title: project.title,
      description: project.description,
      audience: project.audience,
    });
    return Response.json(titles);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Server error";
    return jsonError(message, 503, "unavailable");
  }
}
