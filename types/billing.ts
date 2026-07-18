// Billing — subscription plans + generation credits (replaces BYOK).

export type PlanId = "free" | "creator" | "pro";

export type CreditTxnType =
  | "grant" // monthly plan grant / signup bonus
  | "purchase" // top-up pack
  | "spend" // generation consume
  | "refund" // failed generation refund
  | "adjust"; // admin/manual

export interface BillingPlan {
  id: PlanId;
  name: string;
  price_monthly: number;
  currency: "USD" | "IDR";
  monthly_credits: number;
  max_projects: number | null; // null = unlimited
  max_published: number | null;
  features: string[];
  featured?: boolean;
}

export interface CreditBalance {
  user_id: string;
  plan_id: PlanId;
  /** Remaining credits for generation. */
  balance: number;
  /** Credits granted this billing period. */
  period_grant: number;
  /** Period start ISO. */
  period_start: string;
  /** Period end ISO. */
  period_end: string;
  /** Soft-cap display for UI. */
  lifetime_spent: number;
  updated_at: string;
}

export interface CreditTransaction {
  id: string;
  user_id: string;
  type: CreditTxnType;
  /** Positive = credit in, negative = spend. */
  amount: number;
  balance_after: number;
  label: string;
  meta?: {
    project_id?: string;
    section_id?: string;
    pack_id?: string;
  };
  created_at: string;
}

export interface CreditPack {
  id: string;
  name: string;
  credits: number;
  price: number;
  currency: "USD" | "IDR";
  badge?: string;
}

/** Checkout response when PayCore is enabled. */
export interface PaymentCheckout {
  checkout_url: string;
  order_id: string;
  external_order_id: string;
  amount: number;
  currency: "IDR";
}

export interface Subscription {
  user_id: string;
  plan_id: PlanId;
  status: "active" | "canceled" | "past_due" | "trialing";
  renews_at: string | null;
  canceled_at: string | null;
}
