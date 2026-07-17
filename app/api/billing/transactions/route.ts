import { createClient } from "@/lib/supabase/server";
import { jsonError } from "@/lib/api/errors";
import type { CreditTransaction, CreditTxnType } from "@/types/billing";

function mapTxn(row: Record<string, unknown>): CreditTransaction {
  const meta = row.meta;
  return {
    id: String(row.id),
    user_id: String(row.user_id),
    type: row.type as CreditTxnType,
    amount: Number(row.amount ?? 0),
    balance_after: Number(row.balance_after ?? 0),
    label: String(row.label ?? ""),
    meta:
      meta && typeof meta === "object" && !Array.isArray(meta)
        ? (meta as CreditTransaction["meta"])
        : undefined,
    created_at: String(row.created_at),
  };
}

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
      .from("credit_transactions")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) {
      return jsonError(error.message, 500, "db_error");
    }

    return Response.json((data ?? []).map((row) => mapTxn(row as Record<string, unknown>)));
  } catch (err) {
    const message = err instanceof Error ? err.message : "Server error";
    return jsonError(message, 503, "unavailable");
  }
}
