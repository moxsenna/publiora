// Static billing catalog — plans, packs, generation costs.

import type { BillingPlan, CreditPack } from "@/types/billing";

export const BILLING_PLANS: BillingPlan[] = [
  {
    id: "free",
    name: "Free",
    price_monthly: 0,
    currency: "IDR",
    monthly_credits: 50,
    max_projects: 3,
    max_published: 1,
    features: [
      "50 kredit / bulan",
      "3 project aktif",
      "1 ebook published",
      "Claim link unlimited",
    ],
  },
  {
    id: "creator",
    name: "Creator",
    price_monthly: 299_000,
    currency: "IDR",
    monthly_credits: 500,
    max_projects: null,
    max_published: 10,
    features: [
      "500 kredit / bulan",
      "Unlimited projects",
      "10 ebook published",
      "PDF + EPUB export",
      "Analytics claim dasar",
    ],
    featured: true,
  },
  {
    id: "pro",
    name: "Pro",
    price_monthly: 749_000,
    currency: "IDR",
    monthly_credits: 2000,
    max_projects: null,
    max_published: null,
    features: [
      "2.000 kredit / bulan",
      "Unlimited published",
      "Priority generation queue",
      "CSV export claim events",
      "Custom cover branding",
    ],
  },
];

export const CREDIT_PACKS: CreditPack[] = [
  {
    id: "pack_100",
    name: "Boost 100",
    credits: 100,
    price: 79_000,
    currency: "IDR",
  },
  {
    id: "pack_500",
    name: "Boost 500",
    credits: 500,
    price: 299_000,
    currency: "IDR",
    badge: "Populer",
  },
  {
    id: "pack_1500",
    name: "Boost 1500",
    credits: 1500,
    price: 749_000,
    currency: "IDR",
    badge: "Best value",
  },
];

/** Credit costs for generation actions (MVP). */
export const CREDIT_COSTS = {
  outline: 5,
  section: 10,
  title: 2,
  cta: 2,
  enhancement: 2,
  publish: 0,
} as const;

export type CreditCostKind = keyof typeof CREDIT_COSTS;
