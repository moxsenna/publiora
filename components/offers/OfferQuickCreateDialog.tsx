"use client";

import * as React from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import {
  EMPTY_OFFER_FORM,
  OfferFormFields,
  type OfferFormState,
} from "@/components/offers/OfferFormFields";
import { useCreateOffer } from "@/lib/api/hooks";
import { quickCreateOfferSchema } from "@/lib/offers/schemas";
import type { Offer } from "@/types/offer";

type Props = {
  open: boolean;
  onClose: () => void;
  onCreated: (offer: Offer) => void;
};

export function OfferQuickCreateDialog({ open, onClose, onCreated }: Props) {
  const create = useCreateOffer();
  const [form, setForm] = React.useState<OfferFormState>(EMPTY_OFFER_FORM);
  const [showAdvanced, setShowAdvanced] = React.useState(false);
  const [errors, setErrors] = React.useState<
    Partial<Record<keyof OfferFormState, string>>
  >({});
  const [formError, setFormError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (open) {
      setForm(EMPTY_OFFER_FORM);
      setShowAdvanced(false);
      setErrors({});
      setFormError(null);
    }
  }, [open]);

  const submit = async () => {
    setFormError(null);
    setErrors({});
    const payload = {
      name: form.name,
      offer_type: form.offer_type,
      ownership: form.ownership,
      destination_url: form.destination_url || null,
      short_description: form.short_description || null,
      target_audience: form.target_audience || null,
      primary_outcome: form.primary_outcome || null,
      niche: form.niche || null,
    };
    const parsed = quickCreateOfferSchema.safeParse(payload);
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

    try {
      const result = await create.mutateAsync(parsed.data);
      onCreated(result.offer);
      onClose();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Gagal menyimpan");
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Tambah Produk dengan Cepat"
      description="Isi minimal nama, jenis, dan kepemilikan. Detail bisa dilengkapi nanti."
      size="md"
      footer={
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Batal
          </Button>
          <Button
            type="button"
            onClick={submit}
            loading={create.isPending}
            disabled={create.isPending}
          >
            Simpan dan Pilih
          </Button>
        </div>
      }
    >
      <div className="space-y-3">
        <OfferFormFields
          value={form}
          onChange={setForm}
          errors={errors}
          mode="quick"
          showAdvanced={showAdvanced}
          idPrefix="quick-offer"
        />
        {!showAdvanced ? (
          <button
            type="button"
            className="text-xs font-medium text-[var(--color-publiora-blue)]"
            onClick={() => setShowAdvanced(true)}
          >
            › Tambahkan detail
          </button>
        ) : null}
        {formError ? (
          <p className="text-xs text-[var(--color-danger)]" role="alert">
            {formError}
          </p>
        ) : null}
      </div>
    </Modal>
  );
}
