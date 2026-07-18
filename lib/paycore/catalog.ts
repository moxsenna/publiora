// PayCore product keys + IDR amounts for Publiora billing SKUs.

import { BILLING_PLANS, CREDIT_PACKS } from "@/lib/billing/plans";
import type { PlanId } from "@/types/billing";

export type PayProduct =
  | {
      kind: "credit_pack";
      pack_id: string;
      product_key: string;
      amount_idr: number;
      credits: number;
      description: string;
    }
  | {
      kind: "plan";
      plan_id: Exclude<PlanId, "free">;
      product_key: string;
      amount_idr: number;
      monthly_credits: number;
      description: string;
    };

/** IDR list prices (MVP). Adjust with PayCore product_key registry. */
const PACK_IDR: Record<string, number> = {
  pack_100: 79_000,
  pack_500: 299_000,
  pack_1500: 749_000,
};

const PLAN_IDR: Record<Exclude<PlanId, "free">, number> = {
  creator: 299_000,
  pro: 749_000,
};

export function resolvePackProduct(packId: string): PayProduct | null {
  const pack = CREDIT_PACKS.find((p) => p.id === packId);
  if (!pack) return null;
  const amount = PACK_IDR[pack.id];
  if (!amount) return null;
  return {
    kind: "credit_pack",
    pack_id: pack.id,
    product_key: `publiora_${pack.id}`,
    amount_idr: amount,
    credits: pack.credits,
    description: `Publiora ${pack.name} (+${pack.credits} kredit)`,
  };
}

export function resolvePlanProduct(planId: PlanId): PayProduct | null {
  if (planId === "free") return null;
  const plan = BILLING_PLANS.find((p) => p.id === planId);
  if (!plan) return null;
  const amount = PLAN_IDR[planId];
  if (!amount) return null;
  return {
    kind: "plan",
    plan_id: planId,
    product_key: `publiora_plan_${planId}`,
    amount_idr: amount,
    monthly_credits: plan.monthly_credits,
    description: `Publiora plan ${plan.name} (bulanan)`,
  };
}

export function listPublicPrices() {
  return {
    currency: "IDR" as const,
    packs: CREDIT_PACKS.map((p) => ({
      id: p.id,
      price_idr: PACK_IDR[p.id] ?? null,
    })),
    plans: BILLING_PLANS.filter((p) => p.id !== "free").map((p) => ({
      id: p.id,
      price_idr: PLAN_IDR[p.id as Exclude<PlanId, "free">] ?? null,
    })),
  };
}
