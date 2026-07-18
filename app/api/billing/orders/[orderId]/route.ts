import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { jsonError } from "@/lib/api/errors";

/** Poll own payment order status (return page UX). */
export async function GET(
  _req: Request,
  ctx: { params: Promise<{ orderId: string }> }
) {
  try {
    const { orderId } = await ctx.params;
    if (!orderId) return jsonError("orderId required", 400, "validation_error");

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return jsonError("Unauthorized", 401, "unauthorized");

    const admin = createAdminClient();
    const { data, error } = await admin
      .from("payment_orders")
      .select(
        "id, paycore_order_id, external_order_id, status, amount, currency, kind, pack_id, plan_id, paid_at, created_at"
      )
      .or(
        `paycore_order_id.eq.${orderId},external_order_id.eq.${orderId}`
      )
      .eq("user_id", user.id)
      .maybeSingle();

    if (error) return jsonError(error.message, 500, "db_error");
    if (!data) return jsonError("Order not found", 404, "not_found");

    return Response.json(data);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Server error";
    return jsonError(message, 503, "unavailable");
  }
}
