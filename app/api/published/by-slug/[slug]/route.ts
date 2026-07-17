import { createClient } from "@/lib/supabase/server";
import { jsonError } from "@/lib/api/errors";

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await ctx.params;
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { data, error } = await supabase
      .from("published_ebooks")
      .select("*")
      .eq("slug", slug)
      .maybeSingle();

    if (error) return jsonError(error.message, 500, "db_error");
    if (!data) return jsonError("Ebook not found", 404, "not_found");

    if (!data.is_public && data.creator_id !== user?.id) {
      if (!user) return jsonError("Forbidden", 403, "forbidden");
      const { data: ent } = await supabase
        .from("entitlements")
        .select("id")
        .eq("ebook_id", data.id)
        .eq("reader_id", user.id)
        .maybeSingle();
      if (!ent) return jsonError("Forbidden", 403, "forbidden");
    }

    return Response.json({
      id: data.id,
      project_id: data.project_id,
      slug: data.slug,
      title: data.title,
      author: data.author,
      subtitle: data.subtitle,
      cover_color: data.cover_color,
      sections: data.sections ?? [],
      published_at: data.published_at,
      total_readers: data.total_readers ?? 0,
      active_claims: data.active_claims ?? 0,
      is_public: data.is_public,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Server error";
    return jsonError(message, 503, "unavailable");
  }
}
