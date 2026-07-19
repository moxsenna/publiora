import { createClient } from "@/lib/supabase/server";
import { jsonError } from "@/lib/api/errors";

/** List published ebooks owned by current user (creator dashboard). */
export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return jsonError("Unauthorized", 401, "unauthorized");

    const { data, error } = await supabase
      .from("published_ebooks")
      .select("*")
      .eq("creator_id", user.id)
      .order("published_at", { ascending: false });

    if (error) return jsonError(error.message, 500, "db_error");

    return Response.json(
      (data ?? []).map((p) => ({
        id: p.id,
        project_id: p.project_id,
        slug: p.slug,
        title: p.title,
        author: p.author,
        subtitle: p.subtitle,
        cover_color: p.cover_color,
        sections: p.sections ?? [],
        published_at: p.published_at,
        total_readers: p.total_readers ?? 0,
        active_claims: p.active_claims ?? 0,
        is_public: p.is_public,
        cta_goal: p.cta_goal ?? null,
        final_cta: p.final_cta ?? null,
        cta_url: p.cta_url ?? null,
      }))
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Server error";
    return jsonError(message, 503, "unavailable");
  }
}
