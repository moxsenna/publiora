"use client";

import * as React from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import {
  EMPTY_OFFER_FORM,
  OfferFormFields,
  type OfferFormState,
} from "@/components/offers/OfferFormFields";
import { useCreateOffer, useOffers } from "@/lib/api/hooks";
import { quickCreateOfferSchema } from "@/lib/offers/schemas";
import { useDebouncedValue } from "@/lib/hooks/useDebouncedValue";
import type { Offer } from "@/types/offer";

type Props = {
  open: boolean;
  onClose: () => void;
  onCreated: (offer: Offer) => void;
};

function normalizeOfferName(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, " ");
}

export function OfferQuickCreateDialog({ open, onClose, onCreated }: Props) {
  const create = useCreateOffer();
  const [form, setForm] = React.useState<OfferFormState>(EMPTY_OFFER_FORM);
  const [showAdvanced, setShowAdvanced] = React.useState(false);
  const [errors, setErrors] = React.useState<
    Partial<Record<keyof OfferFormState, string>>
  >({});
  const [formError, setFormError] = React.useState<string | null>(null);
  const [forceCreate, setForceCreate] = React.useState(false);

  const debouncedName = useDebouncedValue(form.name, 300);
  const { data: similarData } = useOffers({
    status: "active",
    search: open && debouncedName.trim().length >= 2 ? debouncedName.trim() : "",
  });

  const duplicateOffer = React.useMemo(() => {
    const needle = normalizeOfferName(debouncedName);
    if (!needle) return null;
    return (
      (similarData?.items ?? []).find(
        (o) => normalizeOfferName(o.name) === needle,
      ) ?? null
    );
  }, [debouncedName, similarData?.items]);

  React.useEffect(() => {
    if (open) {
      setForm(EMPTY_OFFER_FORM);
      setShowAdvanced(false);
      setErrors({});
      setFormError(null);
      setForceCreate(false);
    }
  }, [open]);

  React.useEffect(() => {
    setForceCreate(false);
  }, [form.name]);

  const submit = async (opts?: { force?: boolean }) => {
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

    if (duplicateOffer && !opts?.force && !forceCreate) {
      setFormError("Produk dengan nama serupa sudah ada.");
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
        <div className="flex justify-end gap-2 flex-wrap">
          <Button type="button" variant="secondary" onClick={onClose}>
            Batal
          </Button>
          {duplicateOffer && !forceCreate ? (
            <>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  onCreated(duplicateOffer);
                  onClose();
                }}
              >
                Gunakan yang sudah ada
              </Button>
              <Button
                type="button"
                onClick={() => {
                  setForceCreate(true);
                  void submit({ force: true });
                }}
                loading={create.isPending}
                disabled={create.isPending}
              >
                Tetap buat baru
              </Button>
            </>
          ) : (
            <Button
              type="button"
              onClick={() => void submit()}
              loading={create.isPending}
              disabled={create.isPending}
            >
              Simpan dan Pilih
            </Button>
          )}
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
        {duplicateOffer ? (
          <p className="text-xs text-[var(--color-deep-gray)]" role="status">
            Produk dengan nama serupa sudah ada:{" "}
            <strong>{duplicateOffer.name}</strong>
          </p>
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
