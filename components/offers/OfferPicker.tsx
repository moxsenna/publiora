"use client";

import * as React from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { OfferQuickCreateDialog } from "@/components/offers/OfferQuickCreateDialog";
import { OfferSelectedCard } from "@/components/offers/OfferSelectedCard";
import { OfferSearchResults } from "@/components/offers/OfferSearchResults";
import { useOffers } from "@/lib/api/hooks";
import { useDebouncedValue } from "@/lib/hooks/useDebouncedValue";
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
  const debouncedSearch = useDebouncedValue(search, 300);
  const [openList, setOpenList] = React.useState(false);
  const [quickOpen, setQuickOpen] = React.useState(false);
  const [activeIndex, setActiveIndex] = React.useState(0);
  const listboxId = React.useId();
  const inputRef = React.useRef<HTMLInputElement>(null);

  const { data, isLoading } = useOffers({
    status: "active",
    search: debouncedSearch.trim(),
  });

  const offers = data?.items ?? [];
  const isRecent = debouncedSearch.trim().length === 0;

  React.useEffect(() => {
    setActiveIndex(0);
  }, [debouncedSearch, offers.length]);

  const selectOffer = (offer: Offer) => {
    onChange(offer);
    setOpenList(false);
    setSearch("");
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (!openList && (e.key === "ArrowDown" || e.key === "ArrowUp")) {
      setOpenList(true);
      return;
    }
    if (!openList) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, Math.max(offers.length - 1, 0)));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const offer = offers[activeIndex];
      if (offer) selectOffer(offer);
    } else if (e.key === "Escape") {
      e.preventDefault();
      setOpenList(false);
    }
  };

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
                  queueMicrotask(() => inputRef.current?.focus());
                }
          }
        />
      </div>
    );
  }

  const activeDescendant =
    openList && offers[activeIndex]
      ? `${listboxId}-opt-${offers[activeIndex].id}`
      : undefined;

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
          onClick={() => {
            setOpenList((v) => !v);
            queueMicrotask(() => inputRef.current?.focus());
          }}
          aria-expanded={openList}
          aria-controls={listboxId}
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
            ref={inputRef}
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setOpenList(true);
            }}
            onKeyDown={onKeyDown}
            placeholder="Cari nama produk atau penawaran..."
            aria-label="Cari produk"
            role="combobox"
            aria-expanded={openList}
            aria-controls={listboxId}
            aria-autocomplete="list"
            aria-activedescendant={activeDescendant}
          />
          {isLoading ? (
            <p className="text-xs text-[var(--color-medium-gray)] px-1 py-2">
              Memuat...
            </p>
          ) : (
            <OfferSearchResults
              offers={offers}
              activeIndex={activeIndex}
              listboxId={listboxId}
              emptyLabel="Tidak ada produk. Gunakan tambah cepat."
              recentLabel="Terakhir digunakan"
              isRecent={isRecent}
              onSelect={selectOffer}
              onActiveIndexChange={setActiveIndex}
            />
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
