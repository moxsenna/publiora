"use client";

import { Input, Label, Textarea } from "@/components/ui/Input";
import {
  OFFER_OWNERSHIP_LABELS,
  OFFER_TYPE_LABELS,
} from "@/lib/offers/copy";
import { OFFER_OWNERSHIPS, OFFER_TYPES } from "@/types/offer";

export type OfferFormState = {
  name: string;
  offer_type: string;
  ownership: string;
  destination_url: string;
  short_description: string;
  target_audience: string;
  primary_outcome: string;
  primary_problem: string;
  niche: string;
};

export const EMPTY_OFFER_FORM: OfferFormState = {
  name: "",
  offer_type: "digital_product",
  ownership: "owned",
  destination_url: "",
  short_description: "",
  target_audience: "",
  primary_outcome: "",
  primary_problem: "",
  niche: "",
};

type Props = {
  value: OfferFormState;
  onChange: (next: OfferFormState) => void;
  errors?: Partial<Record<keyof OfferFormState, string>>;
  mode?: "full" | "quick";
  showAdvanced?: boolean;
  idPrefix?: string;
};

export function OfferFormFields({
  value,
  onChange,
  errors = {},
  mode = "full",
  showAdvanced = true,
  idPrefix = "offer",
}: Props) {
  const set = <K extends keyof OfferFormState>(key: K, v: string) =>
    onChange({ ...value, [key]: v });

  return (
    <div className="space-y-3">
      <div>
        <Label htmlFor={`${idPrefix}-name`}>Nama produk</Label>
        <Input
          id={`${idPrefix}-name`}
          value={value.name}
          onChange={(e) => set("name", e.target.value)}
          placeholder="Contoh: Growth Audit untuk SaaS"
          aria-invalid={!!errors.name}
          aria-describedby={errors.name ? `${idPrefix}-name-err` : undefined}
        />
        {errors.name ? (
          <p id={`${idPrefix}-name-err`} className="text-xs text-[var(--color-danger)] mt-1">
            {errors.name}
          </p>
        ) : null}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <Label htmlFor={`${idPrefix}-type`}>Jenis</Label>
          <select
            id={`${idPrefix}-type`}
            className="h-9 w-full rounded-[var(--radius-input)] border border-[var(--color-publiora-border)] bg-white px-3 text-sm"
            value={value.offer_type}
            onChange={(e) => set("offer_type", e.target.value)}
          >
            {OFFER_TYPES.map((t) => (
              <option key={t} value={t}>
                {OFFER_TYPE_LABELS[t]}
              </option>
            ))}
          </select>
        </div>
        <div>
          <Label htmlFor={`${idPrefix}-ownership`}>Kepemilikan</Label>
          <select
            id={`${idPrefix}-ownership`}
            className="h-9 w-full rounded-[var(--radius-input)] border border-[var(--color-publiora-border)] bg-white px-3 text-sm"
            value={value.ownership}
            onChange={(e) => set("ownership", e.target.value)}
          >
            {OFFER_OWNERSHIPS.map((o) => (
              <option key={o} value={o}>
                {OFFER_OWNERSHIP_LABELS[o]}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <Label htmlFor={`${idPrefix}-url`}>URL (opsional)</Label>
        <Input
          id={`${idPrefix}-url`}
          value={value.destination_url}
          onChange={(e) => set("destination_url", e.target.value)}
          placeholder="https://..."
          aria-invalid={!!errors.destination_url}
          aria-describedby={
            errors.destination_url ? `${idPrefix}-url-err` : undefined
          }
        />
        {errors.destination_url ? (
          <p
            id={`${idPrefix}-url-err`}
            className="text-xs text-[var(--color-danger)] mt-1"
          >
            {errors.destination_url}
          </p>
        ) : null}
      </div>

      {(mode === "full" || showAdvanced) && (
        <>
          <div>
            <Label htmlFor={`${idPrefix}-desc`}>Deskripsi singkat</Label>
            <Textarea
              id={`${idPrefix}-desc`}
              value={value.short_description}
              onChange={(e) => set("short_description", e.target.value)}
              rows={2}
            />
          </div>
          <div>
            <Label htmlFor={`${idPrefix}-audience`}>Target pembeli</Label>
            <Input
              id={`${idPrefix}-audience`}
              value={value.target_audience}
              onChange={(e) => set("target_audience", e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor={`${idPrefix}-outcome`}>Hasil utama</Label>
            <Input
              id={`${idPrefix}-outcome`}
              value={value.primary_outcome}
              onChange={(e) => set("primary_outcome", e.target.value)}
            />
          </div>
          {mode === "full" && (
            <>
              <div>
                <Label htmlFor={`${idPrefix}-problem`}>Masalah utama</Label>
                <Input
                  id={`${idPrefix}-problem`}
                  value={value.primary_problem}
                  onChange={(e) => set("primary_problem", e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor={`${idPrefix}-niche`}>Niche</Label>
                <Input
                  id={`${idPrefix}-niche`}
                  value={value.niche}
                  onChange={(e) => set("niche", e.target.value)}
                />
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
