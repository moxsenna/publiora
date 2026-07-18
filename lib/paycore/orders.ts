import { createAdminClient } from "@/lib/supabase/admin";
import { createPayCoreOrder } from "./client";
import type { PayProduct } from "./catalog";

function newExternalOrderId(prefix: string): string {
  const ts = Date.now().toString(36);
  const rnd = crypto.randomUUID().replace(/-/g, "").slice(0, 10);
  return `${prefix}_${ts}_${rnd}`.slice(0, 80);
}

export async function startCheckout(opts: {
  userId: string;
  email: string;
  name: string;
  product: PayProduct;
}) {
  const admin = createAdminClient();
  const external_order_id = newExternalOrderId(
    opts.product.kind === "credit_pack" ? "pub_pack" : "pub_plan"
  );

  const fulfillment_data =
    opts.product.kind === "credit_pack"
      ? {
          user_id: opts.userId,
          package_id: opts.product.pack_id,
          credits: opts.product.credits,
          kind: "credit_pack",
        }
      : {
          user_id: opts.userId,
          plan_id: opts.product.plan_id,
          monthly_credits: opts.product.monthly_credits,
          kind: "plan",
        };

  const insert = {
    user_id: opts.userId,
    external_order_id,
    kind: opts.product.kind,
    product_key: opts.product.product_key,
    pack_id: opts.product.kind === "credit_pack" ? opts.product.pack_id : null,
    plan_id: opts.product.kind === "plan" ? opts.product.plan_id : null,
    amount: opts.product.amount_idr,
    currency: "IDR",
    credits: opts.product.kind === "credit_pack" ? opts.product.credits : null,
    status: "pending" as const,
    fulfillment_data,
  };

  const { data: row, error } = await admin
    .from("payment_orders")
    .insert(insert)
    .select("*")
    .single();
  if (error || !row) {
    throw new Error(error?.message || "Failed to create payment_orders row");
  }

  try {
    const created = await createPayCoreOrder({
      external_order_id,
      product_key: opts.product.product_key,
      description: opts.product.description,
      amount: opts.product.amount_idr,
      currency: "IDR",
      customer: {
        name: opts.name || opts.email.split("@")[0] || "Publiora User",
        email: opts.email,
      },
      fulfillment_data,
      idempotency_key: external_order_id,
    });

    const { error: upErr } = await admin
      .from("payment_orders")
      .update({
        paycore_order_id: created.order_id,
        checkout_url: created.checkout_url,
      })
      .eq("id", row.id);
    if (upErr) throw upErr;

    return {
      checkout_url: created.checkout_url,
      order_id: created.order_id,
      external_order_id,
      amount: opts.product.amount_idr,
      currency: "IDR" as const,
    };
  } catch (e) {
    await admin
      .from("payment_orders")
      .update({ status: "failed" })
      .eq("id", row.id);
    throw e;
  }
}
