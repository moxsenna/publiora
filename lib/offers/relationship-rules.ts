// Allowed project–offer relationships by ebook type.

import type { ProjectOfferRelationship } from "@/types/offer";
import type { EbookType } from "@/types/project";

export const ALLOWED_RELATIONSHIPS_BY_EBOOK_TYPE: Record<
  EbookType,
  readonly ProjectOfferRelationship[]
> = {
  lead_magnet: ["promotes", "upsells_to"],
  bonus_product: ["bonus_for"],
  sellable_ebook: ["bundle_component", "upsells_to", "cross_sells_to"],
};

export function isRelationshipAllowed(params: {
  ebookType: EbookType;
  relationship: ProjectOfferRelationship;
}): boolean {
  const allowed = ALLOWED_RELATIONSHIPS_BY_EBOOK_TYPE[params.ebookType];
  return allowed.includes(params.relationship);
}

export function assertRelationshipAllowed(params: {
  ebookType: EbookType;
  relationship: ProjectOfferRelationship;
}): void {
  if (!isRelationshipAllowed(params)) {
    throw new Error(
      `relationship_not_allowed: ${params.relationship} is not valid for ${params.ebookType}`,
    );
  }
}

/** Default primary relationship for MVP wizard mapping. */
export function defaultRelationshipForEbookType(
  ebookType: EbookType,
): ProjectOfferRelationship | null {
  switch (ebookType) {
    case "lead_magnet":
      return "promotes";
    case "bonus_product":
      return "bonus_for";
    case "sellable_ebook":
      return null;
    default: {
      const _exhaustive: never = ebookType;
      return _exhaustive;
    }
  }
}

/**
 * Map sellable onboarding positioning mode to relationship.
 * Standalone requires no link.
 */
export function relationshipForSellableMode(
  mode: "standalone" | "bundle_component" | "entry_to_offer",
): ProjectOfferRelationship | null {
  switch (mode) {
    case "standalone":
      return null;
    case "bundle_component":
      return "bundle_component";
    case "entry_to_offer":
      return "upsells_to";
    default: {
      const _exhaustive: never = mode;
      return _exhaustive;
    }
  }
}

export function isOfferRequiredForEbookType(
  ebookType: EbookType,
  sellableMode?: "standalone" | "bundle_component" | "entry_to_offer",
): boolean {
  if (ebookType === "bonus_product") return true;
  if (ebookType === "lead_magnet") return false;
  if (ebookType === "sellable_ebook") {
    return sellableMode === "bundle_component" || sellableMode === "entry_to_offer";
  }
  return false;
}
