import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { jsonError } from "@/lib/api/errors";
import { BILLING_PLANS } from "@/lib/billing/plans";
import { grantCredits, mapCreditBalance } from "@/lib/credits";
import { useMockBilling } from "@/lib/paycore/config";
import { resolvePlanProduct } from "@/lib/paycore/catalog";
import { startCheckout } from "@/lib/paycore/orders";
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

/** Apply free plan immediately (no payment). */
async function applyFreePlan(userId: string) {
  const plan = BILLING_PLANS.find((p) => p.id === "free")!;
  const periodStart = new Date();
  const periodEnd = new Date(periodStart.getTime() + 30 * 86400_000);
  const periodStartIso = periodStart.toISOString();
  const periodEndIso = periodEnd.toISOString();
  const admin = createAdminClient();

  const { data: subRow, error: subError } = await admin
    .from("subscriptions")
    .upsert(
      {
        user_id: userId,
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
    throw new Error(subError?.message ?? "Failed to update subscription");
  }

  const { error: balanceResetError } = await admin
    .from("credit_balances")
    .update({
      plan_id: plan.id,
      balance: 0,
      period_grant: plan.monthly_credits,
      period_start: periodStartIso,
      period_end: periodEndIso,
    })
    .eq("user_id", userId);
  if (balanceResetError) throw new Error(balanceResetError.message);

  const granted = await grantCredits({
    userId,
    amount: plan.monthly_credits,
    type: "grant",
    label: `${plan.name} plan — kredit bulanan`,
    meta: { plan_id: plan.id, period_days: 30 },
  });
  if (!granted) throw new Error("Failed to grant credits");

  await admin.from("profiles").update({ plan_id: plan.id }).eq("id", userId);

  const { data: balRow } = await admin
    .from("credit_balances")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  return {
    subscription: mapSubscription(subRow as Record<string, unknown>),
    balance: balRow
      ? mapCreditBalance(balRow as Record<string, unknown>)
      : granted,
  };
}

/** Mock/dev: apply paid plan without PayCore. */
async function applyPaidPlanMock(userId: string, planId: PlanId) {
  const plan = BILLING_PLANS.find((p) => p.id === planId);
  if (!plan) throw new Error("Plan not found");
  const periodStart = new Date();
  const periodEnd = new Date(periodStart.getTime() + 30 * 86400_000);
  const periodStartIso = periodStart.toISOString();
  const periodEndIso = periodEnd.toISOString();
  const admin = createAdminClient();

  const { data: subRow, error: subError } = await admin
    .from("subscriptions")
    .upsert(
      {
        user_id: userId,
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
    throw new Error(subError?.message ?? "Failed to update subscription");
  }

  const { error: balanceResetError } = await admin
    .from("credit_balances")
    .update({
      plan_id: plan.id,
      balance: 0,
      period_grant: plan.monthly_credits,
      period_start: periodStartIso,
      period_end: periodEndIso,
    })
    .eq("user_id", userId);
  if (balanceResetError) throw new Error(balanceResetError.message);

  const granted = await grantCredits({
    userId,
    amount: plan.monthly_credits,
    type: "grant",
    label: `${plan.name} plan — kredit bulanan`,
    meta: { plan_id: plan.id, period_days: 30 },
  });
  if (!granted) throw new Error("Failed to grant credits");

  await admin.from("profiles").update({ plan_id: plan.id }).eq("id", userId);

  let balance: CreditBalance = granted;
  const { data: balRow } = await admin
    .from("credit_balances")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();
  if (balRow) balance = mapCreditBalance(balRow as Record<string, unknown>);

  return {
    subscription: mapSubscription(subRow as Record<string, unknown>),
    balance,
    mock: true as const,
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

    // Free plan always immediate
    if (plan.id === "free") {
      try {
        const result = await applyFreePlan(user.id);
        return Response.json(result);
      } catch (e) {
        const message = e instanceof Error ? e.message : "Failed free plan";
        return jsonError(message, 500, "db_error");
      }
    }

    // Paid plan via PayCore
    if (!useMockBilling()) {
      const product = resolvePlanProduct(plan.id);
      if (!product) {
        return jsonError("Plan price not configured", 500, "config_error");
      }
      try {
        const { resolveCheckoutCustomer } = await import("@/lib/paycore/customer");
        const customer = await resolveCheckoutCustomer(user);
        const checkout = await startCheckout({
          userId: user.id,
          email: customer.email,
          name: customer.name,
          product,
        });
        return Response.json({
          checkout_url: checkout.checkout_url,
          order_id: checkout.order_id,
          external_order_id: checkout.external_order_id,
          amount: checkout.amount,
          currency: checkout.currency,
        });
      } catch (payErr) {
        const message =
          payErr instanceof Error ? payErr.message : "PayCore create order failed";
        return jsonError(message, 502, "paycore_error");
      }
    }

    // Mock paid plan
    try {
      const result = await applyPaidPlanMock(user.id, plan.id);
      return Response.json(result);
    } catch (e) {
      const message = e instanceof Error ? e.message : "Failed plan change";
      return jsonError(message, 500, "db_error");
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Server error";
    return jsonError(message, 503, "unavailable");
  }
}
