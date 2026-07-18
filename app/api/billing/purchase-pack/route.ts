import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { jsonError } from "@/lib/api/errors";
import { CREDIT_PACKS } from "@/lib/billing/plans";
import { grantCredits, mapCreditBalance } from "@/lib/credits";
import type { CreditBalance, CreditTransaction, CreditTxnType } from "@/types/billing";

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

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return jsonError("Unauthorized", 401, "unauthorized");
    }

    const body = (await req.json().catch(() => null)) as { pack_id?: unknown } | null;
    if (!body || typeof body.pack_id !== "string" || !body.pack_id.trim()) {
      return jsonError("pack_id is required", 400, "validation_error");
    }

    const pack = CREDIT_PACKS.find((p) => p.id === body.pack_id);
    if (!pack) {
      return jsonError("Pack not found", 404, "not_found");
    }

    const mockTopup = process.env.CREDITS_MOCK_TOPUP !== "false";
    if (!mockTopup) {
      return jsonError("Payment provider not configured", 501, "not_implemented");
    }

    let balance: CreditBalance;
    try {
      const granted = await grantCredits({
        userId: user.id,
        amount: pack.credits,
        type: "purchase",
        label: `Top-up ${pack.name}`,
        meta: { pack_id: pack.id },
      });
      if (!granted) {
        return jsonError("Failed to grant pack credits", 500, "db_error");
      }
      balance = granted;
    } catch (grantErr) {
      const message = grantErr instanceof Error ? grantErr.message : "grant failed";
      return jsonError(message, 500, "db_error");
    }

    // Latest purchase txn for response
    const admin = createAdminClient();
    const { data: txnRow, error: txnError } = await admin
      .from("credit_transactions")
      .select("*")
      .eq("user_id", user.id)
      .eq("type", "purchase")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (txnError || !txnRow) {
      // balance granted; synthesize txn shape from balance
      const now = new Date().toISOString();
      const txn: CreditTransaction = {
        id: "unknown",
        user_id: user.id,
        type: "purchase",
        amount: pack.credits,
        balance_after: balance.balance,
        label: `Top-up ${pack.name}`,
        meta: { pack_id: pack.id },
        created_at: now,
      };
      // refresh balance
      const { data: balRow } = await admin
        .from("credit_balances")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();
      if (balRow) balance = mapCreditBalance(balRow as Record<string, unknown>);
      return Response.json({ balance, txn });
    }

    return Response.json({
      balance,
      txn: mapTxn(txnRow as Record<string, unknown>),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Server error";
    return jsonError(message, 503, "unavailable");
  }
}
