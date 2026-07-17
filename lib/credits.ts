// Server credit helpers — spend/grant via Supabase RPCs.

import { createAdminClient } from "@/lib/supabase/admin";
import { CREDIT_COSTS, type CreditCostKind } from "@/lib/billing/plans";
import type { CreditBalance, CreditTxnType, PlanId } from "@/types/billing";

export type { CreditCostKind };

export function mapCreditBalance(row: Record<string, unknown>): CreditBalance {
  return {
    user_id: String(row.user_id),
    plan_id: row.plan_id as PlanId,
    balance: Number(row.balance ?? 0),
    period_grant: Number(row.period_grant ?? 0),
    period_start: String(row.period_start),
    period_end: String(row.period_end),
    lifetime_spent: Number(row.lifetime_spent ?? 0),
    updated_at: String(row.updated_at),
  };
}

export async function chargeCredits(opts: {
  userId: string;
  amount: number;
  label: string;
  meta?: Record<string, unknown>;
}) {
  const admin = createAdminClient();
  const { data, error } = await admin.rpc("spend_credits", {
    p_user_id: opts.userId,
    p_amount: opts.amount,
    p_label: opts.label,
    p_meta: opts.meta ?? {},
  });
  if (error) {
    const msg = error.message ?? "";
    if (msg.toLowerCase().includes("insufficient")) {
      const err = new Error(
        "Kredit tidak cukup. Upgrade plan atau beli top-up."
      ) as Error & { code?: string };
      err.code = "insufficient_credits";
      throw err;
    }
    throw error;
  }
  return data ? mapCreditBalance(data as Record<string, unknown>) : data;
}

export async function grantCredits(opts: {
  userId: string;
  amount: number;
  type: Exclude<CreditTxnType, "spend">;
  label: string;
  meta?: Record<string, unknown>;
}) {
  const admin = createAdminClient();
  const { data, error } = await admin.rpc("grant_credits", {
    p_user_id: opts.userId,
    p_amount: opts.amount,
    p_type: opts.type,
    p_label: opts.label,
    p_meta: opts.meta ?? {},
  });
  if (error) throw error;
  return data ? mapCreditBalance(data as Record<string, unknown>) : data;
}

export async function chargeGeneration(
  userId: string,
  kind: CreditCostKind,
  projectId?: string
) {
  const amount = CREDIT_COSTS[kind];
  if (amount <= 0) return null;
  return chargeCredits({
    userId,
    amount,
    label: `Generate ${kind}`,
    meta: projectId ? { project_id: projectId } : {},
  });
}
