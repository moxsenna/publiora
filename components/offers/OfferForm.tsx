"use client";

import * as React from "react";
import { Button } from "@/components/ui/Button";
import {
  EMPTY_OFFER_FORM,
  OfferFormFields,
  type OfferFormState,
} from "@/components/offers/OfferFormFields";
import { createOfferSchema, patchOfferSchema } from "@/lib/offers/schemas";
import type { Offer } from "@/types/offer";

type Props = {
  initial?: Offer | null;
  submitLabel?: string;
  onSubmit: (payload: Record<string, unknown>) => Promise<void>;
  onCancel?: () => void;
};

function fromOffer(offer: Offer): OfferFormState {
  return {
    name: offer.name,
    offer_type: offer.offer_type,
    ownership: offer.ownership,
    destination_url: offer.destination_url ?? "",
    short_description: offer.short_description ?? "",
    target_audience: offer.target_audience ?? "",
    primary_outcome: offer.primary_outcome ?? "",
    primary_problem: offer.primary_problem ?? "",
    niche: offer.niche ?? "",
  };
}

export function OfferForm({
  initial,
  submitLabel = "Simpan",
  onSubmit,
  onCancel,
}: Props) {
  const [form, setForm] = React.useState<OfferFormState>(
    initial ? fromOffer(initial) : EMPTY_OFFER_FORM,
  );
  const [errors, setErrors] = React.useState<
    Partial<Record<keyof OfferFormState, string>>
  >({});
  const [formError, setFormError] = React.useState<string | null>(null);
  const [pending, setPending] = React.useState(false);

  React.useEffect(() => {
    if (initial) setForm(fromOffer(initial));
  }, [initial]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setErrors({});
    const raw = {
      name: form.name,
      offer_type: form.offer_type,
      ownership: form.ownership,
      destination_url: form.destination_url || null,
      short_description: form.short_description || null,
      target_audience: form.target_audience || null,
      primary_outcome: form.primary_outcome || null,
      primary_problem: form.primary_problem || null,
      niche: form.niche || null,
    };

    const parsed = initial
      ? patchOfferSchema.safeParse(raw)
      : createOfferSchema.safeParse(raw);

    if (!parsed.success) {
      const fieldErrors: Partial<Record<keyof OfferFormState, string>> = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path[0];
        if (typeof key === "string") {
          fieldErrors[key as keyof OfferFormState] = issue.message;
        }
      }
      setErrors(fieldErrors);
      setFormError(parsed.error.issues[0]?.message ?? "Data tidak valid");
      return;
    }

    setPending(true);
    try {
      await onSubmit(parsed.data as Record<string, unknown>);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Gagal menyimpan");
    } finally {
      setPending(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <OfferFormFields
        value={form}
        onChange={setForm}
        errors={errors}
        mode="full"
        showAdvanced
      />
      {formError ? (
        <p className="text-xs text-[var(--color-danger)]" role="alert">
          {formError}
        </p>
      ) : null}
      <div className="flex justify-end gap-2">
        {onCancel ? (
          <Button type="button" variant="secondary" onClick={onCancel}>
            Batal
          </Button>
        ) : null}
        <Button type="submit" loading={pending} disabled={pending}>
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}
