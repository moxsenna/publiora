"use client";

import * as React from "react";
import { Button } from "@/components/ui/Button";
import { OfferPicker } from "@/components/offers/OfferPicker";
import { useLinkProjectOffer } from "@/lib/api/hooks";
import { defaultRelationshipForEbookType } from "@/lib/offers/relationship-rules";
import type { EbookType } from "@/types/project";
import type { Offer } from "@/types/offer";

type Props = {
  projectId: string;
  ebookType: EbookType;
  legacyText: string;
  onLinked?: () => void;
};

export function LegacyOfferConversionCard({
  projectId,
  ebookType,
  legacyText,
  onLinked,
}: Props) {
  const [offer, setOffer] = React.useState<Offer | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const link = useLinkProjectOffer();
  const relationship = defaultRelationshipForEbookType(ebookType);

  if (!relationship) return null;

  return (
    <div className="rounded-lg border border-dashed border-[var(--color-publiora-border)] p-3 space-y-3">
      <div>
        <div className="text-sm font-medium">Produk utama saat ini:</div>
        <p className="text-sm text-[var(--color-medium-gray)] mt-1">
          “{legacyText}”
        </p>
      </div>
      <OfferPicker
        label="Hubungkan ke Produk & Penawaran"
        value={offer}
        onChange={setOffer}
        allowNone={false}
      />
      <div className="flex justify-end">
        <Button
          size="sm"
          disabled={!offer || link.isPending}
          loading={link.isPending}
          onClick={async () => {
            if (!offer) return;
            setError(null);
            try {
              await link.mutateAsync({
                projectId,
                offer_id: offer.id,
                relationship,
                is_primary: true,
                replace_primary: true,
              });
              onLinked?.();
            } catch (err) {
              setError(err instanceof Error ? err.message : "Gagal menghubungkan");
            }
          }}
        >
          Hubungkan
        </Button>
      </div>
      {error ? (
        <p className="text-xs text-[var(--color-danger)]">{error}</p>
      ) : null}
    </div>
  );
}
