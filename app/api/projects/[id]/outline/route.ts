import { requireOwnedProject } from "@/lib/api/project-access";
import { jsonError } from "@/lib/api/errors";
import type { Outline, OutlineUpdateInput } from "@/types/outline";

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

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await ctx.params;
    const access = await requireOwnedProject(id);
    if ("error" in access && access.error) return access.error;

    const { supabase } = access;
    const { data, error } = await supabase
      .from("outlines")
      .select("*")
      .eq("project_id", id)
      .maybeSingle();

    if (error) return jsonError(error.message, 500, "db_error");
    if (!data) return Response.json(null);
    return Response.json(mapOutline(data));
  } catch (err) {
    const message = err instanceof Error ? err.message : "Server error";
    return jsonError(message, 503, "unavailable");
  }
}

export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await ctx.params;
    const access = await requireOwnedProject(id);
    if ("error" in access && access.error) return access.error;

    const { supabase, project } = access;
    const body = (await req.json().catch(() => null)) as OutlineUpdateInput | null;
    if (!body) return jsonError("Invalid body", 400, "validation_error");

    const patch: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };
    if (body.title !== undefined) patch.title = body.title;
    if (body.description !== undefined) patch.description = body.description;
    if (body.sections !== undefined) {
      patch.sections = body.sections;
      await supabase
        .from("projects")
        .update({
          total_sections: body.sections.length,
          updated_at: new Date().toISOString(),
        })
        .eq("id", project.id);
    }

    const { data, error } = await supabase
      .from("outlines")
      .update(patch)
      .eq("project_id", id)
      .select("*")
      .single();

    if (error) return jsonError(error.message, 500, "db_error");
    return Response.json(mapOutline(data));
  } catch (err) {
    const message = err instanceof Error ? err.message : "Server error";
    return jsonError(message, 503, "unavailable");
  }
}
