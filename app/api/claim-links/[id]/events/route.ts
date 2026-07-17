import { createClient } from "@/lib/supabase/server";
import { jsonError } from "@/lib/api/errors";

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await ctx.params;
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return jsonError("Unauthorized", 401, "unauthorized");

    const { data: link } = await supabase
      .from("claim_links")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (!link) return jsonError("Not found", 404, "not_found");

    const { data: ebook } = await supabase
      .from("published_ebooks")
      .select("creator_id")
      .eq("id", link.ebook_id)
      .maybeSingle();
    if (ebook?.creator_id !== user.id) {
      return jsonError("Not found", 404, "not_found");
    }

    const { data, error } = await supabase
      .from("claim_events")
      .select("*")
      .eq("claim_link_id", id)
      .order("created_at", { ascending: false });

    if (error) return jsonError(error.message, 500, "db_error");
    return Response.json(data ?? []);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Server error";
    return jsonError(message, 503, "unavailable");
  }
}
