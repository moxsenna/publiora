// Apply paid PayCore order side-effects (credits / plan) — idempotent by order.

import { createAdminClient } from "@/lib/supabase/admin";
import { BILLING_PLANS } from "@/lib/billing/plans";
import { grantCredits } from "@/lib/credits";
import type { PlanId } from "@/types/billing";

export async function fulfillPaidOrder(opts: {
  paycoreOrderId: string;
  eventId: string;
  providerReference?: string | null;
  paidAt?: string | null;
  payload?: unknown;
}): Promise<{ ok: true; already?: boolean; kind?: string }> {
  const admin = createAdminClient();

  // 1) event_id unique — already processed
  const { data: existingEvt } = await admin
    .from("payment_events")
    .select("event_id")
    .eq("event_id", opts.eventId)
    .maybeSingle();
  if (existingEvt) {
    return { ok: true, already: true };
  }

  // 2) load order by paycore id
  const { data: order, error: orderErr } = await admin
    .from("payment_orders")
    .select("*")
    .eq("paycore_order_id", opts.paycoreOrderId)
    .maybeSingle();

  if (orderErr) throw orderErr;
  if (!order) {
    // insert event marker anyway so retries don't thrash unknown orders
    await admin.from("payment_events").upsert({
      event_id: opts.eventId,
      order_id: opts.paycoreOrderId,
      event_type: "payment.succeeded",
      payload: opts.payload ?? {},
    });
    throw new Error(`payment_orders not found for ${opts.paycoreOrderId}`);
  }

  if (order.status === "paid") {
    await admin.from("payment_events").upsert({
      event_id: opts.eventId,
      order_id: opts.paycoreOrderId,
      event_type: "payment.succeeded",
      payload: opts.payload ?? {},
    });
    return { ok: true, already: true, kind: String(order.kind) };
  }

  const paidAt = opts.paidAt || new Date().toISOString();

  if (order.kind === "credit_pack") {
    const credits = Number(order.credits ?? 0);
    if (credits <= 0) throw new Error("invalid credits on order");
    await grantCredits({
      userId: String(order.user_id),
      amount: credits,
      type: "purchase",
      label: `Top-up ${order.product_key}`,
      meta: {
        pack_id: order.pack_id ?? undefined,
        paycore_order_id: opts.paycoreOrderId,
        external_order_id: order.external_order_id,
      },
    });
  } else if (order.kind === "plan") {
    const planId = order.plan_id as PlanId;
    const plan = BILLING_PLANS.find((p) => p.id === planId);
    if (!plan) throw new Error(`unknown plan ${planId}`);

    const periodStart = new Date();
    const periodEnd = new Date(periodStart.getTime() + 30 * 86400_000);
    const periodStartIso = periodStart.toISOString();
    const periodEndIso = periodEnd.toISOString();

    const { error: subError } = await admin.from("subscriptions").upsert(
      {
        user_id: order.user_id,
        plan_id: plan.id,
        status: "active",
        renews_at: periodEndIso,
        canceled_at: null,
      },
      { onConflict: "user_id" }
    );
    if (subError) throw subError;

    const { error: balanceResetError } = await admin
      .from("credit_balances")
      .update({
        plan_id: plan.id,
        balance: 0,
        period_grant: plan.monthly_credits,
        period_start: periodStartIso,
        period_end: periodEndIso,
      })
      .eq("user_id", order.user_id);
    if (balanceResetError) throw balanceResetError;

    await grantCredits({
      userId: String(order.user_id),
      amount: plan.monthly_credits,
      type: "grant",
      label: `${plan.name} plan — kredit bulanan`,
      meta: {
        plan_id: plan.id,
        paycore_order_id: opts.paycoreOrderId,
        external_order_id: order.external_order_id,
      },
    });

    await admin
      .from("profiles")
      .update({ plan_id: plan.id })
      .eq("id", order.user_id);
  } else {
    throw new Error(`unsupported order kind ${order.kind}`);
  }

  const { error: markErr } = await admin
    .from("payment_orders")
    .update({
      status: "paid",
      paid_at: paidAt,
      provider_reference: opts.providerReference ?? null,
    })
    .eq("id", order.id)
    .eq("status", "pending");
  if (markErr) throw markErr;

  const { error: evtErr } = await admin.from("payment_events").insert({
    event_id: opts.eventId,
    order_id: opts.paycoreOrderId,
    event_type: "payment.succeeded",
    payload: opts.payload ?? {},
  });
  // unique violation = concurrent retry already wrote event
  if (evtErr && !String(evtErr.message).toLowerCase().includes("duplicate")) {
    // if event insert fails for other reason, still ok if order paid
    console.error("payment_events insert", evtErr.message);
  }

  return { ok: true, kind: String(order.kind) };
}
