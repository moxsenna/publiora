import { requireOwnedProject } from "@/lib/api/project-access";
import { jsonError } from "@/lib/api/errors";
import { sanitizeHtml } from "@/lib/sanitize";

function slugify(s: string): string {
  return s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 50);
}

export async function POST(
  req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await ctx.params;
    const access = await requireOwnedProject(id);
    if ("error" in access && access.error) return access.error;

    const { supabase, user, project } = access;
    const body = (await req.json().catch(() => ({}))) as { is_public?: boolean };

    const { data: sections, error: secErr } = await supabase
      .from("ebook_sections")
      .select("id, position, title, content_html")
      .eq("project_id", id)
      .in("status", ["generated", "edited"])
      .order("position", { ascending: true });

    if (secErr) return jsonError(secErr.message, 500, "db_error");
    if (!sections?.length) {
      return jsonError("No sections to publish", 400, "empty");
    }

    const now = new Date().toISOString();
    await supabase
      .from("projects")
      .update({ status: "publishing", updated_at: now })
      .eq("id", id);

    const slug =
      slugify(project.title) +
      "-" +
      Math.random().toString(36).slice(2, 6);

    // remove prior publications for project
    await supabase.from("published_ebooks").delete().eq("project_id", id);

    const { data: pub, error: pubErr } = await supabase
      .from("published_ebooks")
      .insert({
        project_id: id,
        creator_id: user.id,
        title: project.title,
        slug,
        subtitle: project.subtitle,
        author: project.author,
        cover_color: project.cover_color,
        sections: sections.map((s) => ({
          id: s.id,
          position: s.position,
          title: s.title,
          content_html: sanitizeHtml(String(s.content_html ?? "")),
        })),
        is_public: body.is_public ?? true,
        total_readers: 0,
        active_claims: 0,
        published_at: now,
      })
      .select("*")
      .single();

    if (pubErr || !pub) {
      await supabase
        .from("projects")
        .update({ status: "generated", updated_at: now })
        .eq("id", id);
      return jsonError(pubErr?.message ?? "Publish failed", 500, "db_error");
    }

    await supabase
      .from("projects")
      .update({
        status: "published",
        published_at: now,
        updated_at: now,
      })
      .eq("id", id);

    return Response.json({
      id: pub.id,
      project_id: pub.project_id,
      slug: pub.slug,
      title: pub.title,
      author: pub.author,
      subtitle: pub.subtitle,
      cover_color: pub.cover_color,
      sections: pub.sections,
      published_at: pub.published_at,
      total_readers: pub.total_readers,
      active_claims: pub.active_claims,
      is_public: pub.is_public,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Server error";
    return jsonError(message, 503, "unavailable");
  }
}
