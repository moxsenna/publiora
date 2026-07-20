"use client";

import { Button } from "@/components/ui/Button";
import { OfferOwnershipBadge } from "@/components/offers/OfferOwnershipBadge";
import { OfferTypeBadge } from "@/components/offers/OfferTypeBadge";
import type { Offer } from "@/types/offer";

type Props = {
  offer: Pick<
    Offer,
    | "id"
    | "name"
    | "offer_type"
    | "ownership"
    | "target_audience"
    | "primary_outcome"
    | "destination_url"
  >;
  onChange?: () => void;
  onDetail?: () => void;
  locked?: boolean;
};

export function OfferSelectedCard({
  offer,
  onChange,
  onDetail,
  locked,
}: Props) {
  return (
    <div className="rounded-lg border border-[var(--color-publiora-border)] bg-[var(--color-surface-1)] p-3 space-y-2">
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="font-medium text-sm text-[var(--color-publiora-black)]">
            {offer.name}
          </div>
          <div className="flex flex-wrap gap-1.5 mt-1.5">
            <OfferTypeBadge offerType={offer.offer_type} />
            <OfferOwnershipBadge ownership={offer.ownership} />
          </div>
        </div>
        <div className="flex gap-1 shrink-0">
          {onDetail ? (
            <Button type="button" size="sm" variant="ghost" onClick={onDetail}>
              Lihat detail
            </Button>
          ) : null}
          {onChange && !locked ? (
            <Button type="button" size="sm" variant="secondary" onClick={onChange}>
              Ganti
            </Button>
          ) : null}
        </div>
      </div>
      {offer.target_audience ? (
        <p className="text-xs text-[var(--color-medium-gray)]">
          Target: {offer.target_audience}
        </p>
      ) : null}
      {offer.primary_outcome ? (
        <p className="text-xs text-[var(--color-medium-gray)]">
          Hasil: {offer.primary_outcome}
        </p>
      ) : null}
    </div>
  );
}
