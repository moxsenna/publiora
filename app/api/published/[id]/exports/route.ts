import { createClient } from "@/lib/supabase/server";
import { jsonError } from "@/lib/api/errors";
import type { ExportFormat } from "@/types/export";

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
      .from("exports")
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

    const body = (await req.json().catch(() => null)) as {
      format?: ExportFormat;
    } | null;
    const format = body?.format;
    if (!format || !["pdf", "epub", "docx"].includes(format)) {
      return jsonError("format must be pdf|epub|docx", 400, "validation_error");
    }

    const { data: ebook } = await supabase
      .from("published_ebooks")
      .select("*")
      .eq("id", ebookId)
      .maybeSingle();
    if (!ebook || ebook.creator_id !== user.id) {
      return jsonError("Not found", 404, "not_found");
    }

    const now = new Date().toISOString();
    const { data: job, error } = await supabase
      .from("exports")
      .insert({
        ebook_id: ebookId,
        ebook_title: ebook.title,
        format,
        status: "processing",
        url: null,
        error: null,
        created_at: now,
      })
      .select("*")
      .single();

    if (error || !job) {
      return jsonError(error?.message ?? "Export failed", 500, "db_error");
    }

    // MVP stub: complete immediately with downloadable placeholder URL
    const url = `#/download/${ebook.slug}.${format}`;
    const { data: done, error: upErr } = await supabase
      .from("exports")
      .update({
        status: "complete",
        url,
        completed_at: new Date().toISOString(),
      })
      .eq("id", job.id)
      .select("*")
      .single();

    if (upErr) return jsonError(upErr.message, 500, "db_error");
    return Response.json(done);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Server error";
    return jsonError(message, 503, "unavailable");
  }
}
