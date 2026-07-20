// Offer Library domain — reusable product/offer entity + project links.

export type OfferOwnership = "owned" | "affiliate" | "client";

export type OfferType =
  | "digital_product"
  | "course"
  | "service"
  | "saas"
  | "membership"
  | "webinar"
  | "physical_product"
  | "affiliate_product"
  | "other";

export type OfferStatus = "active" | "archived";

export type ProjectOfferRelationship =
  | "promotes"
  | "bonus_for"
  | "bundle_component"
  | "upsells_to"
  | "cross_sells_to";

/** Snapshot fields accepted by a project at link/sync time. Server-built only. */
export interface OfferContextSnapshot {
  version: 1;

  offer_id: string;
  name: string;
  offer_type: OfferType;
  ownership: OfferOwnership;

  short_description: string | null;
  target_audience: string | null;
  primary_problem: string | null;
  primary_outcome: string | null;
  niche: string | null;

  destination_url: string | null;
}

export interface Offer {
  id: string;
  owner_id: string;

  name: string;
  offer_type: OfferType;
  ownership: OfferOwnership;
  status: OfferStatus;

  short_description: string | null;
  target_audience: string | null;
  primary_problem: string | null;
  primary_outcome: string | null;
  niche: string | null;
  destination_url: string | null;

  created_at: string;
  updated_at: string;
}

export interface ProjectOfferLink {
  id: string;
  project_id: string;
  offer_id: string;
  relationship: ProjectOfferRelationship;
  is_primary: boolean;
  context_snapshot: OfferContextSnapshot;
  source_offer_updated_at: string;
  synced_at: string;
  created_at: string;
  updated_at: string;
}

export interface OfferLinkedProjectSummary {
  project_id: string;
  title: string;
  ebook_type: string;
  status: string;
  relationship: ProjectOfferRelationship;
  is_primary: boolean;
  source_is_newer: boolean;
  updated_at: string;
}

export interface ProjectOfferContext {
  link_id: string;
  relationship: ProjectOfferRelationship;
  snapshot: OfferContextSnapshot;
  source_is_newer: boolean;
}

export const OFFER_TYPES: OfferType[] = [
  "digital_product",
  "course",
  "service",
  "saas",
  "membership",
  "webinar",
  "physical_product",
  "affiliate_product",
  "other",
];

export const OFFER_OWNERSHIPS: OfferOwnership[] = [
  "owned",
  "affiliate",
  "client",
];

export const OFFER_STATUSES: OfferStatus[] = ["active", "archived"];

export const PROJECT_OFFER_RELATIONSHIPS: ProjectOfferRelationship[] = [
  "promotes",
  "bonus_for",
  "bundle_component",
  "upsells_to",
  "cross_sells_to",
];
