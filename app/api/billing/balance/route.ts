import { createClient } from "@/lib/supabase/server";
import { jsonError } from "@/lib/api/errors";
import { mapCreditBalance } from "@/lib/credits";

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return jsonError("Unauthorized", 401, "unauthorized");
    }

    const { data, error } = await supabase
      .from("credit_balances")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();

    if (error) {
      return jsonError(error.message, 500, "db_error");
    }
    if (!data) {
      return jsonError("Credit balance not found", 404, "not_found");
    }

    return Response.json(mapCreditBalance(data as Record<string, unknown>));
  } catch (err) {
    const message = err instanceof Error ? err.message : "Server error";
    return jsonError(message, 503, "unavailable");
  }
}
