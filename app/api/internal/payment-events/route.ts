import { jsonError } from "@/lib/api/errors";
import { verifyPayCoreEvent } from "@/lib/paycore/crypto";
import { isPayCoreConfigured, getPayCoreConfig } from "@/lib/paycore/config";
import { fulfillPaidOrder } from "@/lib/paycore/fulfill";

export const runtime = "nodejs";

/**
 * PayCore → Publiora webhook.
 * Register this URL in PayCore apps.webhook_url:
 *   https://publiora.appvibe.biz.id/api/internal/payment-events
 */
export async function POST(req: Request) {
  try {
    if (!isPayCoreConfigured()) {
      return jsonError("PayCore not configured", 503, "unavailable");
    }

    const rawBody = await req.text();
    const timestamp = req.headers.get("X-PayCore-Event-Timestamp") ?? "";
    const signature = req.headers.get("X-PayCore-Event-Signature") ?? "";
    const cfg = getPayCoreConfig();

    const ok = await verifyPayCoreEvent({
      webhookSecret: cfg.webhookSecret,
      timestampHeader: timestamp,
      rawBody,
      signatureHeader: signature,
    });
    if (!ok) {
      return jsonError("Invalid signature", 401, "unauthorized");
    }

    let payload: {
      event_id?: string;
      event_type?: string;
      data?: {
        order_id?: string;
        external_order_id?: string;
        provider_reference?: string | null;
        paid_at?: string;
        fulfillment_data?: Record<string, unknown>;
      };
    };
    try {
      payload = JSON.parse(rawBody);
    } catch {
      return jsonError("Invalid JSON", 400, "validation_error");
    }

    if (payload.event_type !== "payment.succeeded") {
      // Acknowledge unknown events so PayCore does not retry forever
      return Response.json({ ok: true, ignored: true });
    }

    const eventId = payload.event_id;
    const orderId = payload.data?.order_id;
    if (!eventId || !orderId) {
      return jsonError("event_id and data.order_id required", 400, "validation_error");
    }

    try {
      const result = await fulfillPaidOrder({
        paycoreOrderId: orderId,
        eventId,
        providerReference: payload.data?.provider_reference,
        paidAt: payload.data?.paid_at,
        payload,
      });
      return Response.json({
        ok: true,
        already: result.already ?? false,
        kind: result.kind,
      });
    } catch (fulfillErr) {
      const message =
        fulfillErr instanceof Error ? fulfillErr.message : "Fulfillment failed";
      console.error("fulfillPaidOrder", message);
      // Non-2xx → PayCore retries
      return jsonError(message, 500, "fulfillment_error");
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Server error";
    return jsonError(message, 503, "unavailable");
  }
}
