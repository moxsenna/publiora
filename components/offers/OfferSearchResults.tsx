"use client";

import type { Offer } from "@/types/offer";
import { OfferOwnershipBadge } from "@/components/offers/OfferOwnershipBadge";
import { OfferTypeBadge } from "@/components/offers/OfferTypeBadge";
import { cn } from "@/lib/utils";

export function OfferSearchResults({
  offers,
  activeIndex,
  listboxId,
  emptyLabel,
  recentLabel,
  isRecent,
  onSelect,
  onActiveIndexChange,
}: {
  offers: Offer[];
  activeIndex: number;
  listboxId: string;
  emptyLabel: string;
  recentLabel?: string;
  isRecent?: boolean;
  onSelect: (offer: Offer) => void;
  onActiveIndexChange: (index: number) => void;
}) {
  if (offers.length === 0) {
    return (
      <p className="text-xs text-[var(--color-medium-gray)] px-1 py-2">
        {emptyLabel}
      </p>
    );
  }

  return (
    <div>
      {isRecent && recentLabel ? (
        <p className="text-[11px] font-medium text-[var(--color-medium-gray)] px-2 py-1">
          {recentLabel}
        </p>
      ) : null}
      <ul
        id={listboxId}
        className="max-h-56 overflow-y-auto space-y-1"
        role="listbox"
      >
        {offers.map((offer, index) => {
          const optionId = `${listboxId}-opt-${offer.id}`;
          const active = index === activeIndex;
          return (
            <li key={offer.id} role="presentation">
              <button
                type="button"
                id={optionId}
                role="option"
                aria-selected={active}
                className={cn(
                  "w-full text-left rounded-md px-2 py-2 min-h-11",
                  active
                    ? "bg-[var(--color-surface-2)]"
                    : "hover:bg-[var(--color-surface-2)]",
                )}
                onMouseEnter={() => onActiveIndexChange(index)}
                onClick={() => onSelect(offer)}
              >
                <div className="text-sm font-medium">{offer.name}</div>
                <div className="flex flex-wrap gap-1 mt-1">
                  <OfferTypeBadge offerType={offer.offer_type} />
                  <OfferOwnershipBadge ownership={offer.ownership} />
                </div>
                {offer.target_audience ? (
                  <div className="text-xs text-[var(--color-medium-gray)] mt-1">
                    {offer.target_audience}
                  </div>
                ) : null}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
