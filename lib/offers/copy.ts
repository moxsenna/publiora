// Indonesian labels for Offer Library UI.

import type {
  OfferOwnership,
  OfferStatus,
  OfferType,
  ProjectOfferRelationship,
} from "@/types/offer";
import type { EbookType } from "@/types/project";

export const OFFER_LIBRARY_LABEL = "Produk & Penawaran";

export const OFFER_TYPE_LABELS: Record<OfferType, string> = {
  digital_product: "Produk digital",
  course: "Kelas / course",
  service: "Jasa / layanan",
  saas: "Software / SaaS",
  membership: "Membership / komunitas",
  webinar: "Webinar / event",
  physical_product: "Produk fisik",
  affiliate_product: "Produk affiliate",
  other: "Lainnya",
};

export const OFFER_OWNERSHIP_LABELS: Record<OfferOwnership, string> = {
  owned: "Milik saya",
  affiliate: "Produk affiliate",
  client: "Produk klien",
};

export const OFFER_STATUS_LABELS: Record<OfferStatus, string> = {
  active: "Aktif",
  archived: "Diarsipkan",
};

export const PROJECT_OFFER_RELATIONSHIP_LABELS: Record<
  ProjectOfferRelationship,
  string
> = {
  promotes: "Dipromosikan",
  bonus_for: "Bonus untuk produk",
  bundle_component: "Bagian bundle",
  upsells_to: "Mengarahkan ke penawaran",
  cross_sells_to: "Cross-sell ke penawaran",
};

/** Relationship label in project/Strategy context by ebook type. */
export function describeProjectOfferRelationship(
  ebookType: EbookType,
  relationship: ProjectOfferRelationship,
): string {
  if (ebookType === "lead_magnet") {
    if (relationship === "promotes") {
      return "Dipromosikan oleh Lead Magnet";
    }
    if (relationship === "upsells_to") {
      return "Upsell dari Lead Magnet";
    }
  }
  if (ebookType === "bonus_product" && relationship === "bonus_for") {
    return "Produk utama untuk Bonus Pembelian";
  }
  if (ebookType === "sellable_ebook") {
    if (relationship === "bundle_component") {
      return "Ebook sebagai bagian bundle";
    }
    if (relationship === "upsells_to") {
      return "Ebook entry menuju penawaran lain";
    }
    if (relationship === "cross_sells_to") {
      return "Cross-sell dari ebook berbayar";
    }
  }
  return PROJECT_OFFER_RELATIONSHIP_LABELS[relationship];
}

/**
 * Ownership-sensitive wording guidance for agents / UI copy.
 * Avoid first-person ownership claims for affiliate/client offers.
 */
export function ownershipCopyGuidance(ownership: OfferOwnership): string {
  switch (ownership) {
    case "owned":
      return "Gunakan bahasa produk milik kreator secara langsung.";
    case "affiliate":
      return "Jangan mengklaim kepemilikan. Gunakan bahasa rekomendasi yang transparan.";
    case "client":
      return "Hindari menyiratkan penawaran milik pengguna. Gunakan nama/brand klien secara netral.";
    default: {
      const _exhaustive: never = ownership;
      return _exhaustive;
    }
  }
}

export function offerTypeLabel(type: OfferType): string {
  return OFFER_TYPE_LABELS[type];
}

export function offerOwnershipLabel(ownership: OfferOwnership): string {
  return OFFER_OWNERSHIP_LABELS[ownership];
}
