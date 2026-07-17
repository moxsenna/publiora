import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { jsonError } from "@/lib/api/errors";
import { BILLING_PLANS } from "@/lib/billing/plans";
import { grantCredits, mapCreditBalance } from "@/lib/credits";
import type { CreditBalance, PlanId, Subscription } from "@/types/billing";

function isPlanId(value: unknown): value is PlanId {
  return value === "free" || value === "creator" || value === "pro";
}

function mapSubscription(row: Record<string, unknown>): Subscription {
  return {
    user_id: String(row.user_id),
    plan_id: row.plan_id as PlanId,
    status: row.status as Subscription["status"],
    renews_at: row.renews_at != null ? String(row.renews_at) : null,
    canceled_at: row.canceled_at != null ? String(row.canceled_at) : null,
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

    const body = (await req.json().catch(() => null)) as { plan_id?: unknown } | null;
    if (!body || !isPlanId(body.plan_id)) {
      return jsonError("plan_id must be free|creator|pro", 400, "validation_error");
    }

    const plan = BILLING_PLANS.find((p) => p.id === body.plan_id);
    if (!plan) {
      return jsonError("Plan not found", 404, "not_found");
    }

    const periodStart = new Date();
    const periodEnd = new Date(periodStart.getTime() + 30 * 86400_000);
    const periodStartIso = periodStart.toISOString();
    const periodEndIso = periodEnd.toISOString();

    const admin = createAdminClient();

    // Update subscription (admin bypasses RLS write limits)
    const { data: subRow, error: subError } = await admin
      .from("subscriptions")
      .upsert(
        {
          user_id: user.id,
          plan_id: plan.id,
          status: "active",
          renews_at: periodEndIso,
          canceled_at: null,
        },
        { onConflict: "user_id" }
      )
      .select("*")
      .single();

    if (subError || !subRow) {
      return jsonError(subError?.message ?? "Failed to update subscription", 500, "db_error");
    }

    // Reset period fields on balance (grant_credits only adds amount)
    const { error: balanceResetError } = await admin
      .from("credit_balances")
      .update({
        plan_id: plan.id,
        balance: 0,
        period_grant: plan.monthly_credits,
        period_start: periodStartIso,
        period_end: periodEndIso,
      })
      .eq("user_id", user.id);

    if (balanceResetError) {
      return jsonError(balanceResetError.message, 500, "db_error");
    }

    // Grant monthly credits as transaction
    let balance: CreditBalance;
    try {
      const granted = await grantCredits({
        userId: user.id,
        amount: plan.monthly_credits,
        type: "grant",
        label: `${plan.name} plan — kredit bulanan`,
        meta: { plan_id: plan.id, period_days: 30 },
      });
      if (!granted) {
        return jsonError("Failed to grant credits", 500, "db_error");
      }
      balance = granted;
    } catch (grantErr) {
      const message = grantErr instanceof Error ? grantErr.message : "grant failed";
      return jsonError(message, 500, "db_error");
    }

    // Keep profiles.plan_id in sync
    const { error: profileError } = await admin
      .from("profiles")
      .update({ plan_id: plan.id })
      .eq("id", user.id);

    if (profileError) {
      return jsonError(profileError.message, 500, "db_error");
    }

    // Re-fetch balance to ensure period fields present
    const { data: balRow } = await admin
      .from("credit_balances")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();

    if (balRow) {
      balance = mapCreditBalance(balRow as Record<string, unknown>);
    }

    return Response.json({
      subscription: mapSubscription(subRow as Record<string, unknown>),
      balance,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Server error";
    return jsonError(message, 503, "unavailable");
  }
}
