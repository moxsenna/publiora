// Server-side offer context snapshot builder. Never trust client snapshots.

import type { Offer, OfferContextSnapshot } from "@/types/offer";

export function buildOfferContextSnapshot(
  offer: Pick<
    Offer,
    | "id"
    | "name"
    | "offer_type"
    | "ownership"
    | "short_description"
    | "target_audience"
    | "primary_problem"
    | "primary_outcome"
    | "niche"
    | "destination_url"
  >,
): OfferContextSnapshot {
  return {
    version: 1,
    offer_id: offer.id,
    name: offer.name,
    offer_type: offer.offer_type,
    ownership: offer.ownership,
    short_description: offer.short_description ?? null,
    target_audience: offer.target_audience ?? null,
    primary_problem: offer.primary_problem ?? null,
    primary_outcome: offer.primary_outcome ?? null,
    niche: offer.niche ?? null,
    destination_url: offer.destination_url ?? null,
  };
}

/** Detect whether live offer is newer than the accepted snapshot metadata. */
export function sourceIsNewer(
  offerUpdatedAt: string,
  sourceOfferUpdatedAt: string,
): boolean {
  const a = Date.parse(offerUpdatedAt);
  const b = Date.parse(sourceOfferUpdatedAt);
  if (Number.isNaN(a) || Number.isNaN(b)) return false;
  return a > b;
}

export type SyncableOfferField =
  | "name"
  | "short_description"
  | "target_audience"
  | "primary_problem"
  | "primary_outcome"
  | "niche"
  | "destination_url";

export function diffOfferSnapshot(
  current: OfferContextSnapshot,
  next: OfferContextSnapshot,
): Array<{
  field: SyncableOfferField;
  from: string | null;
  to: string | null;
}> {
  const fields: SyncableOfferField[] = [
    "name",
    "short_description",
    "target_audience",
    "primary_problem",
    "primary_outcome",
    "niche",
    "destination_url",
  ];

  const out: Array<{
    field: SyncableOfferField;
    from: string | null;
    to: string | null;
  }> = [];

  for (const field of fields) {
    const from = current[field] ?? null;
    const to = next[field] ?? null;
    if (from !== to) {
      out.push({ field, from, to });
    }
  }

  return out;
}

export function applySnapshotFields(
  base: OfferContextSnapshot,
  source: OfferContextSnapshot,
  fields: SyncableOfferField[],
): OfferContextSnapshot {
  const next: OfferContextSnapshot = { ...base };
  for (const field of fields) {
    if (field === "name") {
      next.name = source.name;
    } else {
      next[field] = source[field] ?? null;
    }
  }
  return next;
}
