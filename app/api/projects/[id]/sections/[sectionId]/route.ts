import { requireOwnedProject } from "@/lib/api/project-access";
import { jsonError } from "@/lib/api/errors";
import type { Section, SectionUpdateInput } from "@/types/section";
import { sanitizeHtml } from "@/lib/sanitize";

function mapSection(row: Record<string, unknown>): Section {
  return {
    id: String(row.id),
    project_id: String(row.project_id),
    outline_section_id: String(row.outline_section_id),
    position: Number(row.position),
    title: String(row.title),
    content_html: String(row.content_html ?? ""),
    word_count: Number(row.word_count ?? 0),
    status: row.status as Section["status"],
    generation_meta:
      row.generation_meta && typeof row.generation_meta === "object"
        ? (row.generation_meta as Record<string, unknown>)
        : undefined,
    updated_at: String(row.updated_at),
  };
}

export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ id: string; sectionId: string }> },
) {
  try {
    const { id, sectionId } = await ctx.params;
    const access = await requireOwnedProject(id);
    if ("error" in access && access.error) return access.error;

    const { supabase } = access;
    const body = (await req.json().catch(() => null)) as SectionUpdateInput | null;
    if (!body) return jsonError("Invalid body", 400, "validation_error");

    const patch: Record<string, unknown> = {
      status: "edited",
      updated_at: new Date().toISOString(),
    };
    if (body.title !== undefined) patch.title = body.title;
    if (body.content_html !== undefined) {
      const clean = sanitizeHtml(body.content_html);
      patch.content_html = clean;
      patch.word_count = clean
        .replace(/<[^>]+>/g, " ")
        .split(/\s+/)
        .filter(Boolean).length;
    }

    let query = supabase
      .from("ebook_sections")
      .update(patch)
      .eq("id", sectionId)
      .eq("project_id", id);

    if (body.expected_updated_at) {
      query = query.eq("updated_at", body.expected_updated_at);
    }

    const { data, error } = await query.select("*").maybeSingle();

    if (error) return jsonError(error.message, 500, "db_error");
    if (!data) {
      // Distinguish missing vs stale concurrency token.
      if (body.expected_updated_at) {
        const { data: existing } = await supabase
          .from("ebook_sections")
          .select("id, updated_at")
          .eq("id", sectionId)
          .eq("project_id", id)
          .maybeSingle();
        if (existing) {
          return jsonError(
            "Section was modified elsewhere",
            409,
            "section_conflict",
            {
              server_updated_at: existing.updated_at,
            },
          );
        }
      }
      return jsonError("Section not found", 404, "not_found");
    }
    return Response.json(mapSection(data));
  } catch (err) {
    const message = err instanceof Error ? err.message : "Server error";
    return jsonError(message, 503, "unavailable");
  }
}
