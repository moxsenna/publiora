import { createClient } from "@/lib/supabase/server";
import { jsonError } from "@/lib/api/errors";

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return jsonError("Unauthorized", 401, "unauthorized");

    const { data, error } = await supabase
      .from("reading_progress")
      .select("*")
      .eq("reader_id", user.id)
      .order("last_read_at", { ascending: false });

    if (error) return jsonError(error.message, 500, "db_error");
    return Response.json(data ?? []);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Server error";
    return jsonError(message, 503, "unavailable");
  }
}

export async function PATCH(req: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return jsonError("Unauthorized", 401, "unauthorized");

    const body = (await req.json().catch(() => null)) as {
      ebook_id?: string;
      progress?: number;
      current_section?: number;
    } | null;

    if (!body?.ebook_id) {
      return jsonError("ebook_id required", 400, "validation_error");
    }

    const { data: ebook } = await supabase
      .from("published_ebooks")
      .select("*")
      .eq("id", body.ebook_id)
      .maybeSingle();
    if (!ebook) return jsonError("Ebook not found", 404, "not_found");

    const total =
      Array.isArray(ebook.sections) ? ebook.sections.length : 1;
    const now = new Date().toISOString();

    const { data: existing } = await supabase
      .from("reading_progress")
      .select("*")
      .eq("reader_id", user.id)
      .eq("ebook_id", body.ebook_id)
      .maybeSingle();

    if (existing) {
      const { data, error } = await supabase
        .from("reading_progress")
        .update({
          progress: body.progress ?? existing.progress,
          current_section: body.current_section ?? existing.current_section,
          last_read_at: now,
        })
        .eq("id", existing.id)
        .select("*")
        .single();
      if (error) return jsonError(error.message, 500, "db_error");
      return Response.json(data);
    }

    const { data, error } = await supabase
      .from("reading_progress")
      .insert({
        reader_id: user.id,
        ebook_id: body.ebook_id,
        ebook_title: ebook.title,
        cover_color: ebook.cover_color,
        author: ebook.author,
        progress: body.progress ?? 0,
        current_section: body.current_section ?? 1,
        total_sections: total,
        last_read_at: now,
      })
      .select("*")
      .single();

    if (error) return jsonError(error.message, 500, "db_error");
    return Response.json(data);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Server error";
    return jsonError(message, 503, "unavailable");
  }
}
