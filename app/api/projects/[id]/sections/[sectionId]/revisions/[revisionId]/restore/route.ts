import { requireOwnedProject } from "@/lib/api/project-access";
import { jsonError } from "@/lib/api/errors";
import type { Section } from "@/types/section";
import { createSectionRevision } from "@/lib/section-revisions";
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

export async function POST(
  _req: Request,
  ctx: {
    params: Promise<{ id: string; sectionId: string; revisionId: string }>;
  },
) {
  try {
    const { id, sectionId, revisionId } = await ctx.params;
    const access = await requireOwnedProject(id);
    if ("error" in access && access.error) return access.error;
    const { supabase } = access;

    const { data: section, error: secErr } = await supabase
      .from("ebook_sections")
      .select("*")
      .eq("id", sectionId)
      .eq("project_id", id)
      .maybeSingle();
    if (secErr) return jsonError(secErr.message, 500, "db_error");
    if (!section) return jsonError("Section not found", 404, "not_found");

    const { data: revision, error: revErr } = await supabase
      .from("ebook_section_revisions")
      .select("*")
      .eq("id", revisionId)
      .eq("section_id", sectionId)
      .eq("project_id", id)
      .maybeSingle();
    if (revErr) return jsonError(revErr.message, 500, "db_error");
    if (!revision) return jsonError("Revision not found", 404, "not_found");

    // Snapshot current content before restore (no AI credit).
    const snap = await createSectionRevision(supabase, {
      section: {
        id: String(section.id),
        project_id: id,
        title: String(section.title),
        content_html: String(section.content_html ?? ""),
        word_count: Number(section.word_count ?? 0),
      },
      source: "manual_version",
    });
    if (!snap.ok) {
      return jsonError(snap.error, 500, "db_error");
    }

    const clean = sanitizeHtml(String(revision.content_html ?? ""));
    const word_count = clean
      .replace(/<[^>]+>/g, " ")
      .split(/\s+/)
      .filter(Boolean).length;
    const now = new Date().toISOString();

    const { data: updated, error: upErr } = await supabase
      .from("ebook_sections")
      .update({
        title: String(revision.title),
        content_html: clean,
        word_count,
        status: "edited",
        updated_at: now,
      })
      .eq("id", sectionId)
      .eq("project_id", id)
      .select("*")
      .single();

    if (upErr || !updated) {
      return jsonError(upErr?.message ?? "Restore failed", 500, "db_error");
    }
    return Response.json(mapSection(updated));
  } catch (err) {
    const message = err instanceof Error ? err.message : "Server error";
    return jsonError(message, 503, "unavailable");
  }
}
