import { createClient } from "@/lib/supabase/server";
import { jsonError } from "@/lib/api/errors";

function newToken(): string {
  return (
    Math.random().toString(36).slice(2, 10) +
    Math.random().toString(36).slice(2, 10)
  ).toUpperCase();
}

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    const { id: ebookId } = await ctx.params;
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return jsonError("Unauthorized", 401, "unauthorized");

    const { data: ebook } = await supabase
      .from("published_ebooks")
      .select("id, creator_id")
      .eq("id", ebookId)
      .maybeSingle();
    if (!ebook || ebook.creator_id !== user.id) {
      return jsonError("Not found", 404, "not_found");
    }

    const { data, error } = await supabase
      .from("claim_links")
      .select("*")
      .eq("ebook_id", ebookId)
      .order("created_at", { ascending: false });

    if (error) return jsonError(error.message, 500, "db_error");
    return Response.json(data ?? []);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Server error";
    return jsonError(message, 503, "unavailable");
  }
}

export async function POST(
  req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    const { id: ebookId } = await ctx.params;
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return jsonError("Unauthorized", 401, "unauthorized");

    const { data: ebook } = await supabase
      .from("published_ebooks")
      .select("id, creator_id")
      .eq("id", ebookId)
      .maybeSingle();
    if (!ebook || ebook.creator_id !== user.id) {
      return jsonError("Not found", 404, "not_found");
    }

    const body = (await req.json().catch(() => null)) as {
      label?: string;
      max_uses?: number | null;
      expires_in_days?: number;
    } | null;

    if (!body?.label?.trim()) {
      return jsonError("label required", 400, "validation_error");
    }

    const expires_at =
      body.expires_in_days != null
        ? new Date(Date.now() + body.expires_in_days * 86400_000).toISOString()
        : null;

    const { data, error } = await supabase
      .from("claim_links")
      .insert({
        ebook_id: ebookId,
        token: newToken(),
        label: body.label.trim(),
        status: "active",
        max_uses: body.max_uses ?? null,
        used_count: 0,
        expires_at,
        revoked_at: null,
      })
      .select("*")
      .single();

    if (error) return jsonError(error.message, 500, "db_error");

    // simple increment active_claims
    const { data: pub } = await supabase
      .from("published_ebooks")
      .select("active_claims")
      .eq("id", ebookId)
      .single();
    if (pub) {
      await supabase
        .from("published_ebooks")
        .update({ active_claims: (pub.active_claims ?? 0) + 1 })
        .eq("id", ebookId);
    }

    return Response.json(data);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Server error";
    return jsonError(message, 503, "unavailable");
  }
}
