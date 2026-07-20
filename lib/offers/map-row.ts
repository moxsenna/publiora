// Map DB rows to Offer domain types.

import type { Offer, OfferContextSnapshot, OfferOwnership, OfferStatus, OfferType, ProjectOfferLink, ProjectOfferRelationship } from "@/types/offer";

export function mapOfferRow(row: Record<string, unknown>): Offer {
  return {
    id: String(row.id),
    owner_id: String(row.owner_id),
    name: String(row.name),
    offer_type: row.offer_type as OfferType,
    ownership: row.ownership as OfferOwnership,
    status: row.status as OfferStatus,
    short_description: (row.short_description as string | null) ?? null,
    target_audience: (row.target_audience as string | null) ?? null,
    primary_problem: (row.primary_problem as string | null) ?? null,
    primary_outcome: (row.primary_outcome as string | null) ?? null,
    niche: (row.niche as string | null) ?? null,
    destination_url: (row.destination_url as string | null) ?? null,
    created_at: String(row.created_at),
    updated_at: String(row.updated_at),
  };
}

export function mapProjectOfferLinkRow(row: Record<string, unknown>): ProjectOfferLink {
  return {
    id: String(row.id),
    project_id: String(row.project_id),
    offer_id: String(row.offer_id),
    relationship: row.relationship as ProjectOfferRelationship,
    is_primary: Boolean(row.is_primary),
    context_snapshot: row.context_snapshot as OfferContextSnapshot,
    source_offer_updated_at: String(row.source_offer_updated_at),
    synced_at: String(row.synced_at),
    created_at: String(row.created_at),
    updated_at: String(row.updated_at),
  };
}

export function offerInsertFromCreate(
  input: {
    name: string;
    offer_type: string;
    ownership: string;
    short_description?: string | null;
    target_audience?: string | null;
    primary_problem?: string | null;
    primary_outcome?: string | null;
    niche?: string | null;
    destination_url?: string | null;
  },
  ownerId: string,
) {
  return {
    owner_id: ownerId,
    name: input.name,
    offer_type: input.offer_type,
    ownership: input.ownership,
    status: "active" as const,
    short_description: input.short_description ?? null,
    target_audience: input.target_audience ?? null,
    primary_problem: input.primary_problem ?? null,
    primary_outcome: input.primary_outcome ?? null,
    niche: input.niche ?? null,
    destination_url: input.destination_url ?? null,
  };
}
