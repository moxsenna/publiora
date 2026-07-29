"use client";

import type {
  FieldErrors,
  UseFormRegister,
  UseFormSetValue,
  UseFormWatch,
} from "react-hook-form";
import { Label } from "@/components/ui/Input";
import {
  BONUS_ROLE_LABELS,
  USAGE_MOMENT_OPTIONS,
} from "@/lib/projects/project-type-copy";
import { BONUS_ROLES } from "@/types/project";
import type { WizardFormValues } from "@/components/projects/new/wizard-types";
import { OfferPicker } from "@/components/offers/OfferPicker";
import type { Offer } from "@/types/offer";
import {
  applyOfferPrefill,
  buildOfferPrefill,
  clearOfferDerivedFields,
  type FieldOrigin,
} from "@/lib/offers/prefill";

const BONUS_INTENT_CHIPS: Array<{
  label: string;
  role: WizardFormValues["bonus_role"];
}> = [
  { label: "Mempraktikkan materi produk", role: "implementation_aid" },
  { label: "Mempercepat hasil", role: "speed_to_result" },
  { label: "Mendapat aset siap pakai", role: "ready_to_use_assets" },
  { label: "Mengatasi bagian yang sulit", role: "objection_handler" },
  { label: "Menyiapkan langkah berikutnya", role: "support_next_step" },
];

export function BonusProductFields({
  register,
  errors,
  watch,
  setValue,
  selectedOffer,
  onSelectedOfferChange,
  fieldOrigins,
  setFieldOrigins,
  offerLocked = false,
  onOfferUnlock,
}: {
  register: UseFormRegister<WizardFormValues>;
  errors: FieldErrors<WizardFormValues>;
  watch: UseFormWatch<WizardFormValues>;
  setValue: UseFormSetValue<WizardFormValues>;
  selectedOffer: Offer | null;
  onSelectedOfferChange: (offer: Offer | null) => void;
  fieldOrigins: Partial<Record<string, FieldOrigin>>;
  setFieldOrigins: (
    next:
      | Partial<Record<string, FieldOrigin>>
      | ((
          prev: Partial<Record<string, FieldOrigin>>,
        ) => Partial<Record<string, FieldOrigin>>),
  ) => void;
  offerLocked?: boolean;
  onOfferUnlock?: () => void;
}) {
  const bonusIntent = watch("bonus_intent");

  const handleOffer = (offer: Offer | null) => {
    onSelectedOfferChange(offer);
    if (!offer) {
      const cleared = clearOfferDerivedFields({
        current: {
          audience: watch("audience"),
          primary_problem: watch("primary_problem"),
          niche: watch("niche"),
          cta_url: watch("cta_url"),
          product_or_offer: watch("parent_product"),
        },
        origins: fieldOrigins as never,
      });
      setValue("audience", cleared.values.audience ?? "");
      setValue("primary_problem", cleared.values.primary_problem ?? "");
      setValue("niche", cleared.values.niche ?? "");
      setValue("cta_url", cleared.values.cta_url ?? "");
      setValue("parent_product", cleared.values.product_or_offer ?? "");
      setFieldOrigins(cleared.origins as never);
      setValue("selected_offer_id", null);
      setValue("offer_mode", "none");
      return;
    }
    setValue("selected_offer_id", offer.id);
    setValue("offer_mode", "existing");

    const prefill = buildOfferPrefill(offer);
    const applied = applyOfferPrefill({
      current: {
        audience: watch("audience"),
        primary_problem: watch("primary_problem"),
        niche: watch("niche"),
        cta_url: watch("cta_url"),
        product_or_offer: watch("parent_product"),
      },
      origins: fieldOrigins as never,
      prefill,
      replaceOfferDerived: true,
    });
    if (applied.values.audience != null) {
      setValue("audience", applied.values.audience || "");
    }
    if (applied.values.primary_problem != null) {
      setValue("primary_problem", applied.values.primary_problem || "");
    }
    if (applied.values.niche != null) {
      setValue("niche", applied.values.niche || "");
    }
    if (applied.values.cta_url != null) {
      setValue("cta_url", applied.values.cta_url || "");
    }
    if (applied.values.product_or_offer != null) {
      setValue("parent_product", applied.values.product_or_offer || "");
    }
    setFieldOrigins(applied.origins as never);
  };

  return (
    <div className="space-y-4 rounded-xl border border-[var(--color-publiora-border)] p-4">
      <h3 className="text-sm font-semibold text-[var(--color-publiora-black)]">
        Bonus ini melengkapi produk apa?
      </h3>

      <OfferPicker
        label="Produk utama"
        value={selectedOffer}
        onChange={handleOffer}
        allowNone={false}
        locked={offerLocked}
        onUnlock={onOfferUnlock}
      />
      {errors.selected_offer_id && (
        <p className="text-xs text-red-600">
          {errors.selected_offer_id.message as string}
        </p>
      )}

      <div>
        <Label>Bonus ini membantu pembeli untuk...</Label>
        <div className="flex flex-wrap gap-1.5 mt-2">
          {BONUS_INTENT_CHIPS.map((chip) => {
            const active = bonusIntent === chip.label;
            return (
              <button
                key={chip.label}
                type="button"
                className={`h-9 px-2.5 rounded-full text-xs font-medium border min-h-11 ${
                  active
                    ? "bg-[var(--color-publiora-black)] text-white border-transparent"
                    : "bg-white text-[var(--color-deep-gray)] border-[var(--color-publiora-border)]"
                }`}
                onClick={() => {
                  setValue("bonus_intent", chip.label, { shouldDirty: true });
                  setValue("bonus_role", chip.role, { shouldDirty: true });
                }}
              >
                {chip.label}
              </button>
            );
          })}
        </div>
        <input type="hidden" {...register("bonus_intent")} />
        {errors.bonus_intent && (
          <p className="mt-1 text-xs text-red-600">
            {errors.bonus_intent.message}
          </p>
        )}
      </div>

      <div>
        <Label htmlFor="bonus_role">Fungsi bonus (opsional, bisa diubah)</Label>
        <select
          id="bonus_role"
          className="h-9 w-full rounded-[var(--radius-input)] border border-[var(--color-publiora-border)] bg-white px-3 text-sm"
          {...register("bonus_role")}
        >
          <option value="">Tentukan nanti di Strategy</option>
          {BONUS_ROLES.map((r) => (
            <option key={r} value={r}>
              {BONUS_ROLE_LABELS[r]}
            </option>
          ))}
        </select>
      </div>

      <div>
        <Label htmlFor="usage_moment">
          Kapan bonus digunakan? (opsional)
        </Label>
        <select
          id="usage_moment"
          className="h-9 w-full rounded-[var(--radius-input)] border border-[var(--color-publiora-border)] bg-white px-3 text-sm"
          {...register("usage_moment")}
        >
          <option value="">Strategist bisa bantu lengkapi</option>
          {USAGE_MOMENT_OPTIONS.map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
