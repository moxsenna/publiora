"use client";

import type {
  FieldErrors,
  UseFormRegister,
  UseFormSetValue,
  UseFormWatch,
} from "react-hook-form";
import { Label, Textarea } from "@/components/ui/Input";
import type { WizardFormValues } from "@/components/projects/new/wizard-types";
import { OfferPicker } from "@/components/offers/OfferPicker";
import type { Offer } from "@/types/offer";

const MODES: Array<{
  value: NonNullable<WizardFormValues["sellable_mode"]>;
  label: string;
  help: string;
}> = [
  {
    value: "standalone",
    label: "Produk mandiri",
    help: "Ebook dijual sendiri tanpa penawaran induk.",
  },
  {
    value: "bundle_component",
    label: "Bagian dari bundle",
    help: "Ebook menjadi komponen penawaran/bundle.",
  },
  {
    value: "entry_to_offer",
    label: "Produk entry menuju penawaran lain",
    help: "Ebook entry yang mengarah ke penawaran lanjutan.",
  },
];

export function SellableEbookFields({
  register,
  errors,
  watch,
  setValue,
  selectedOffer,
  onSelectedOfferChange,
}: {
  register: UseFormRegister<WizardFormValues>;
  errors: FieldErrors<WizardFormValues>;
  watch: UseFormWatch<WizardFormValues>;
  setValue: UseFormSetValue<WizardFormValues>;
  selectedOffer: Offer | null;
  onSelectedOfferChange: (offer: Offer | null) => void;
}) {
  const mode = watch("sellable_mode");
  const needsOffer = mode === "bundle_component" || mode === "entry_to_offer";

  return (
    <div className="space-y-4 rounded-xl border border-[var(--color-publiora-border)] p-4">
      <h3 className="text-sm font-semibold text-[var(--color-publiora-black)]">
        Peran ebook ini
      </h3>

      <div className="space-y-2">
        {MODES.map((m) => (
          <label
            key={m.value}
            className={`flex gap-3 rounded-lg border p-3 cursor-pointer min-h-11 ${
              mode === m.value
                ? "border-[var(--color-publiora-black)] bg-[var(--color-surface-2)]"
                : "border-[var(--color-publiora-border)]"
            }`}
          >
            <input
              type="radio"
              className="mt-1"
              value={m.value}
              checked={mode === m.value}
              onChange={() => {
                setValue("sellable_mode", m.value, { shouldDirty: true });
                if (m.value === "standalone") {
                  onSelectedOfferChange(null);
                  setValue("selected_offer_id", null);
                  setValue("offer_mode", "none");
                }
              }}
            />
            <span>
              <span className="block text-sm font-medium">{m.label}</span>
              <span className="block text-xs text-[var(--color-medium-gray)]">
                {m.help}
              </span>
            </span>
          </label>
        ))}
        {errors.sellable_mode && (
          <p className="text-xs text-red-600">{errors.sellable_mode.message}</p>
        )}
      </div>

      {needsOffer ? (
        <OfferPicker
          label={
            mode === "bundle_component"
              ? "Bundle / penawaran induk"
              : "Penawaran lanjutan"
          }
          value={selectedOffer}
          onChange={(offer) => {
            onSelectedOfferChange(offer);
            setValue("selected_offer_id", offer?.id ?? null);
            setValue("offer_mode", offer ? "existing" : "none");
          }}
          allowNone={false}
        />
      ) : null}

      <div>
        <Label htmlFor="buyer_objections_text">
          Keberatan pembeli (opsional)
        </Label>
        <Textarea
          id="buyer_objections_text"
          rows={3}
          placeholder={
            "Satu keberatan per baris\nContoh: Pembeli merasa informasi serupa tersedia gratis"
          }
          {...register("buyer_objections_text")}
        />
      </div>
    </div>
  );
}
