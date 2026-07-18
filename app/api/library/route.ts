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
      .from("entitlements")
      .select("*")
      .eq("reader_id", user.id)
      .order("created_at", { ascending: false });

    if (error) return jsonError(error.message, 500, "db_error");
    return Response.json(data ?? []);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Server error";
    return jsonError(message, 503, "unavailable");
  }
}
