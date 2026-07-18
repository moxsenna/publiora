import { getPayCoreConfig } from "./config";
import { signPayCoreRequest } from "./crypto";

/**
 * Duitku V2 methods allowlisted by PayCore.
 * Sandbox note: SQ (Nusapay) often OFF — prefer NQ / BR.
 */
export type DuitkuV2PaymentMethod =
  | "SQ"
  | "NQ"
  | "SP"
  | "GQ"
  | "BR"
  | "DM"
  | "BV"
  | "M2"
  | "BT"
  | "I1"
  | "NC"
  | "A1"
  | "FT";

/** Default for Publiora checkout when UI has not chosen a method yet. */
export const DEFAULT_DUITKU_V2_METHOD: DuitkuV2PaymentMethod =
  (process.env.PAYCORE_DEFAULT_PAYMENT_METHOD as DuitkuV2PaymentMethod) ||
  "BR";

export type CreateOrderInput = {
  external_order_id: string;
  product_key: string;
  description: string;
  amount: number;
  currency?: "IDR";
  customer: { name: string; email: string; phone?: string };
  fulfillment_data: Record<string, unknown>;
  idempotency_key: string;
  /** Required for Duitku V2. Default NQ (QRIS Nobu). */
  payment_method?: DuitkuV2PaymentMethod;
};

export type CreateOrderResponse = {
  order_id: string;
  external_order_id: string;
  payment_status: string;
  fulfillment_status: string;
  provider: string;
  checkout_url: string;
  expires_at?: string;
  provider_variant?: string;
  payment_method?: string | null;
};

export type OrderStatusResponse = {
  order_id: string;
  external_order_id?: string;
  payment_status: string;
  fulfillment_status?: string;
  amount?: number;
  currency?: string;
  checkout_url?: string | null;
};

export async function createPayCoreOrder(
  input: CreateOrderInput
): Promise<CreateOrderResponse> {
  const cfg = getPayCoreConfig();
  const path = "/v1/orders";
  // App default merchant on PayCore is Duitku V2 — always send payment_method.
  const bodyObj = {
    external_order_id: input.external_order_id,
    product_key: input.product_key,
    description: input.description,
    amount: input.amount,
    currency: input.currency ?? "IDR",
    customer: input.customer,
    return_url: cfg.returnUrl,
    fulfillment_data: input.fulfillment_data,
    payment_method: input.payment_method ?? DEFAULT_DUITKU_V2_METHOD,
  };
  const rawBody = JSON.stringify(bodyObj);
  const timestamp = new Date().toISOString();
  const signature = await signPayCoreRequest({
    appSecret: cfg.appSecret,
    timestamp,
    method: "POST",
    path,
    rawBody,
  });

  const res = await fetch(`${cfg.baseUrl}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-PayCore-App": cfg.appId,
      "X-PayCore-Key-Id": cfg.keyId,
      "X-PayCore-Timestamp": timestamp,
      "X-PayCore-Signature": `sha256=${signature}`,
      "Idempotency-Key": input.idempotency_key.slice(0, 128),
    },
    body: rawBody,
  });

  const text = await res.text();
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    json = { raw: text };
  }

  if (!res.ok) {
    const msg =
      typeof json === "object" &&
      json &&
      "error" in json &&
      typeof (json as { error?: { message?: string } }).error?.message === "string"
        ? (json as { error: { message: string } }).error.message
        : `PayCore order failed (${res.status})`;
    const err = new Error(msg) as Error & { status?: number; body?: unknown };
    err.status = res.status;
    err.body = json;
    throw err;
  }

  return json as CreateOrderResponse;
}

export async function getPayCoreOrder(
  orderId: string
): Promise<OrderStatusResponse> {
  const cfg = getPayCoreConfig();
  const path = `/v1/orders/${encodeURIComponent(orderId)}`;
  const rawBody = "";
  const timestamp = new Date().toISOString();
  const signature = await signPayCoreRequest({
    appSecret: cfg.appSecret,
    timestamp,
    method: "GET",
    path,
    rawBody,
  });

  const res = await fetch(`${cfg.baseUrl}${path}`, {
    method: "GET",
    headers: {
      "X-PayCore-App": cfg.appId,
      "X-PayCore-Key-Id": cfg.keyId,
      "X-PayCore-Timestamp": timestamp,
      "X-PayCore-Signature": `sha256=${signature}`,
    },
  });

  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(
      (json as { error?: { message?: string } })?.error?.message ||
        `PayCore get order failed (${res.status})`
    ) as Error & { status?: number };
    err.status = res.status;
    throw err;
  }
  return json as OrderStatusResponse;
}
