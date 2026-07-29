// Payment order lifecycle persisted by public.payment_orders.

export type PaymentOrderStatus =
  | "pending"
  | "paid"
  | "failed"
  | "expired"
  | "canceled";
