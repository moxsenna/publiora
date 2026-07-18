// In-memory mock database for Publiora MVP frontend.
// Acts as the "backend" dataset for the mock API layer.

import type {
  ChatMessage,
  ClaimEvent,
  ClaimLink,
  CreditBalance,
  CreditPack,
  CreditTransaction,
  Entitlement,
  ExportJob,
  Outline,
  BillingPlan,
  Project,
  PublishedEbook,
  ReadingProgress,
  Section,
  Subscription,
  Template,
} from "@/types";
import type { Profile } from "@/types/auth";

import {
  seedProfile,
  seedProjects,
  seedOutlines,
  seedSections,
  seedMessages,
  seedPublished,
  seedClaimLinks,
  seedClaimEvents,
  seedEntitlements,
  seedReadingProgress,
  seedExports,
  seedTemplates,
  seedPlans,
  seedCreditPacks,
  seedCreditBalance,
  seedSubscription,
  seedCreditTxns,
} from "./seed";

export interface MockDb {
  profiles: Profile[];
  projects: Project[];
  outlines: Outline[];
  sections: Section[];
  messages: ChatMessage[];
  published: PublishedEbook[];
  claimLinks: ClaimLink[];
  claimEvents: ClaimEvent[];
  entitlements: Entitlement[];
  readingProgress: ReadingProgress[];
  exports: ExportJob[];
  templates: Template[];
  plans: BillingPlan[];
  creditPacks: CreditPack[];
  creditBalance: CreditBalance;
  subscription: Subscription;
  creditTxns: CreditTransaction[];
}

let db: MockDb | null = null;

export function getDb(): MockDb {
  if (!db) {
    db = {
      profiles: structuredClone(seedProfile),
      projects: structuredClone(seedProjects),
      outlines: structuredClone(seedOutlines),
      sections: structuredClone(seedSections),
      messages: structuredClone(seedMessages),
      published: structuredClone(seedPublished),
      claimLinks: structuredClone(seedClaimLinks),
      claimEvents: structuredClone(seedClaimEvents),
      entitlements: structuredClone(seedEntitlements),
      readingProgress: structuredClone(seedReadingProgress),
      exports: structuredClone(seedExports),
      templates: structuredClone(seedTemplates),
      plans: structuredClone(seedPlans),
      creditPacks: structuredClone(seedCreditPacks),
      creditBalance: structuredClone(seedCreditBalance),
      subscription: structuredClone(seedSubscription),
      creditTxns: structuredClone(seedCreditTxns),
    };
  }
  return db;
}

export function resetDb(): void {
  db = null;
}

/** Generate a random id string. */
export function newId(prefix = "id"): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

/** Generate a random claim token. */
export function newToken(): string {
  return (
    Math.random().toString(36).slice(2, 10) +
    Math.random().toString(36).slice(2, 10)
  ).toUpperCase();
}

/** Generate a slug from a title. */
export function slugify(s: string): string {
  return s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 60);
}
