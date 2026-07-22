import { requireOwnedProject } from "@/lib/api/project-access";
import { jsonError } from "@/lib/api/errors";
import type {
  SectionRevision,
  SectionRevisionSource,
} from "@/types/section-revision";
import { createSectionRevision } from "@/lib/section-revisions";

function mapRevision(row: Record<string, unknown>): SectionRevision {
  return {
    id: String(row.id),
    section_id: String(row.section_id),
    project_id: String(row.project_id),
    title: String(row.title),
    content_html: String(row.content_html ?? ""),
    word_count: Number(row.word_count ?? 0),
    source: row.source as SectionRevision["source"],
    created_at: String(row.created_at),
  };
}

const ALLOWED_SOURCES: SectionRevisionSource[] = [
  "before_regenerate",
  "before_enhancement_accept",
  "manual_version",
];

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string; sectionId: string }> },
) {
  try {
    const { id, sectionId } = await ctx.params;
    const access = await requireOwnedProject(id);
    if ("error" in access && access.error) return access.error;
    const { supabase } = access;

    const { data: section, error: secErr } = await supabase
      .from("ebook_sections")
      .select("id")
      .eq("id", sectionId)
      .eq("project_id", id)
      .maybeSingle();
    if (secErr) return jsonError(secErr.message, 500, "db_error");
    if (!section) return jsonError("Section not found", 404, "not_found");

    const { data, error } = await supabase
      .from("ebook_section_revisions")
      .select("*")
      .eq("project_id", id)
      .eq("section_id", sectionId)
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) return jsonError(error.message, 500, "db_error");
    return Response.json((data ?? []).map((r) => mapRevision(r)));
  } catch (err) {
    const message = err instanceof Error ? err.message : "Server error";
    return jsonError(message, 503, "unavailable");
  }
}

/** Create a manual / pre-enhancement snapshot of the current section. */
export async function POST(
  req: Request,
  ctx: { params: Promise<{ id: string; sectionId: string }> },
) {
  try {
    const { id, sectionId } = await ctx.params;
    const access = await requireOwnedProject(id);
    if ("error" in access && access.error) return access.error;
    const { supabase } = access;

    const body = (await req.json().catch(() => null)) as {
      source?: SectionRevisionSource;
    } | null;
    const source = body?.source ?? "manual_version";
    if (!ALLOWED_SOURCES.includes(source)) {
      return jsonError("Invalid revision source", 400, "validation_error");
    }

    const { data: section, error: secErr } = await supabase
      .from("ebook_sections")
      .select("id, project_id, title, content_html, word_count")
      .eq("id", sectionId)
      .eq("project_id", id)
      .maybeSingle();
    if (secErr) return jsonError(secErr.message, 500, "db_error");
    if (!section) return jsonError("Section not found", 404, "not_found");

    const result = await createSectionRevision(supabase, {
      section: {
        id: String(section.id),
        project_id: id,
        title: String(section.title),
        content_html: String(section.content_html ?? ""),
        word_count: Number(section.word_count ?? 0),
      },
      source,
    });
    if (!result.ok) return jsonError(result.error, 500, "db_error");
    return Response.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Server error";
    return jsonError(message, 503, "unavailable");
  }
}
