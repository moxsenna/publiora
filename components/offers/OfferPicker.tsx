"use client";

import * as React from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { OfferQuickCreateDialog } from "@/components/offers/OfferQuickCreateDialog";
import { OfferSelectedCard } from "@/components/offers/OfferSelectedCard";
import { OfferOwnershipBadge } from "@/components/offers/OfferOwnershipBadge";
import { OfferTypeBadge } from "@/components/offers/OfferTypeBadge";
import { useOffers } from "@/lib/api/hooks";
import type { Offer } from "@/types/offer";

type Props = {
  value: Offer | null;
  onChange: (offer: Offer | null) => void;
  allowNone?: boolean;
  noneLabel?: string;
  locked?: boolean;
  label?: string;
};

export function OfferPicker({
  value,
  onChange,
  allowNone = false,
  noneLabel = "Belum ada produk",
  locked = false,
  label = "Produk atau penawaran",
}: Props) {
  const [search, setSearch] = React.useState("");
  const [openList, setOpenList] = React.useState(false);
  const [quickOpen, setQuickOpen] = React.useState(false);
  const { data, isLoading } = useOffers({
    status: "active",
    search: search.trim(),
  });

  if (value) {
    return (
      <div className="space-y-2">
        <div className="text-sm font-medium text-[var(--color-deep-gray)]">
          {label}
        </div>
        <OfferSelectedCard
          offer={value}
          locked={locked}
          onChange={
            locked
              ? undefined
              : () => {
                  onChange(null);
                  setOpenList(true);
                }
          }
        />
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="text-sm font-medium text-[var(--color-deep-gray)]">
        {label}
      </div>
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          size="sm"
          variant="secondary"
          onClick={() => setOpenList((v) => !v)}
          aria-expanded={openList}
        >
          Pilih produk atau penawaran
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => setQuickOpen(true)}
        >
          + Tambah cepat
        </Button>
        {allowNone ? (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={() => onChange(null)}
          >
            {noneLabel}
          </Button>
        ) : null}
      </div>

      {openList ? (
        <div className="rounded-lg border border-[var(--color-publiora-border)] p-2 space-y-2">
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari nama produk atau penawaran..."
            aria-label="Cari produk"
          />
          {isLoading ? (
            <p className="text-xs text-[var(--color-medium-gray)] px-1 py-2">
              Memuat...
            </p>
          ) : (data?.items ?? []).length === 0 ? (
            <p className="text-xs text-[var(--color-medium-gray)] px-1 py-2">
              Tidak ada produk. Gunakan tambah cepat.
            </p>
          ) : (
            <ul className="max-h-56 overflow-y-auto space-y-1" role="listbox">
              {(data?.items ?? []).map((offer) => (
                <li key={offer.id}>
                  <button
                    type="button"
                    role="option"
                    className="w-full text-left rounded-md px-2 py-2 hover:bg-[var(--color-surface-2)] min-h-11"
                    onClick={() => {
                      onChange(offer);
                      setOpenList(false);
                    }}
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
              ))}
            </ul>
          )}
        </div>
      ) : null}

      <OfferQuickCreateDialog
        open={quickOpen}
        onClose={() => setQuickOpen(false)}
        onCreated={(offer) => {
          onChange(offer);
          setOpenList(false);
        }}
      />
    </div>
  );
}
