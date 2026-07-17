import { requireOwnedProject } from "@/lib/api/project-access";
import { jsonError } from "@/lib/api/errors";
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
  try {
    const { id } = await ctx.params;
    const access = await requireOwnedProject(id);
    if ("error" in access && access.error) return access.error;

    const { supabase } = access;
    const now = new Date().toISOString();

    const { data, error } = await supabase
      .from("outlines")
      .update({
        approved: true,
        approved_at: now,
        updated_at: now,
      })
      .eq("project_id", id)
      .select("*")
      .maybeSingle();

    if (error) return jsonError(error.message, 500, "db_error");
    if (!data) return jsonError("Outline not found", 404, "not_found");

    await supabase
      .from("projects")
      .update({ status: "approved", updated_at: now })
      .eq("id", id);

    return Response.json(mapOutline(data));
  } catch (err) {
    const message = err instanceof Error ? err.message : "Server error";
    return jsonError(message, 503, "unavailable");
  }
}
