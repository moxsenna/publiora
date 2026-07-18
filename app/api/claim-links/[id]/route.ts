import { createClient } from "@/lib/supabase/server";
import { jsonError } from "@/lib/api/errors";

export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await ctx.params;
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return jsonError("Unauthorized", 401, "unauthorized");

    const body = (await req.json().catch(() => null)) as {
      action?: "revoke";
    } | null;

    const { data: link } = await supabase
      .from("claim_links")
      .select("*, published_ebooks!inner(creator_id)")
      .eq("id", id)
      .maybeSingle();

    // Simpler ownership check without join if join fails
    let owned = false;
    if (link) {
      const { data: ebook } = await supabase
        .from("published_ebooks")
        .select("creator_id")
        .eq("id", link.ebook_id)
        .maybeSingle();
      owned = ebook?.creator_id === user.id;
    }
    if (!link || !owned) return jsonError("Not found", 404, "not_found");

    if (body?.action === "revoke") {
      const { data, error } = await supabase
        .from("claim_links")
        .update({
          status: "revoked",
          revoked_at: new Date().toISOString(),
        })
        .eq("id", id)
        .select("*")
        .single();
      if (error) return jsonError(error.message, 500, "db_error");
      return Response.json(data);
    }

    return jsonError("Unknown action", 400, "validation_error");
  } catch (err) {
    const message = err instanceof Error ? err.message : "Server error";
    return jsonError(message, 503, "unavailable");
  }
}

export async function DELETE(
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

    const { error } = await supabase.from("claim_links").delete().eq("id", id);
    if (error) return jsonError(error.message, 500, "db_error");
    return Response.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Server error";
    return jsonError(message, 503, "unavailable");
  }
}
