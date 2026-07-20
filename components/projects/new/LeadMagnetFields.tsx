"use client";

import type {
  FieldErrors,
  UseFormRegister,
  UseFormSetValue,
  UseFormWatch,
} from "react-hook-form";
import { Input, Label } from "@/components/ui/Input";
import {
  CTA_GOAL_LABELS_ID,
  LEAD_GOAL_LABELS,
  TRAFFIC_SOURCE_OPTIONS,
} from "@/lib/projects/project-type-copy";
import { CTA_URL_REQUIRED_GOALS, type CtaGoal } from "@/types/ai-suggestions";
import { LEAD_GOALS } from "@/types/project";
import type { WizardFormValues } from "@/components/projects/new/wizard-types";
import { OfferPicker } from "@/components/offers/OfferPicker";
import type { Offer } from "@/types/offer";
import { applyOfferPrefill, buildOfferPrefill, type FieldOrigin } from "@/lib/offers/prefill";

const CTA_GOALS = Object.keys(CTA_GOAL_LABELS_ID) as CtaGoal[];

export function LeadMagnetFields({
  register,
  errors,
  watch,
  setValue,
  selectedOffer,
  onSelectedOfferChange,
  fieldOrigins,
  setFieldOrigins,
}: {
  register: UseFormRegister<WizardFormValues>;
  errors: FieldErrors<WizardFormValues>;
  watch: UseFormWatch<WizardFormValues>;
  setValue: UseFormSetValue<WizardFormValues>;
  selectedOffer: Offer | null;
  onSelectedOfferChange: (offer: Offer | null) => void;
  fieldOrigins: Partial<Record<string, FieldOrigin>>;
  setFieldOrigins: (next: Partial<Record<string, FieldOrigin>>) => void;
}) {
  const postRead = watch("post_read_action");
  const needsUrl =
    !!postRead &&
    (CTA_URL_REQUIRED_GOALS as CtaGoal[]).includes(postRead as CtaGoal);
  const noOffer = watch("no_offer");

  const handleOffer = (offer: Offer | null) => {
    onSelectedOfferChange(offer);
    if (!offer) {
      setValue("selected_offer_id", null);
      setValue("offer_mode", "none");
      setValue("no_offer", true);
      return;
    }
    setValue("no_offer", false);
    setValue("selected_offer_id", offer.id);
    setValue("offer_mode", "existing");
    setValue("next_offer", offer.name);

    const prefill = buildOfferPrefill(offer);
    const applied = applyOfferPrefill({
      current: {
        audience: watch("audience"),
        primary_problem: watch("primary_problem"),
        niche: watch("niche"),
        cta_url: watch("cta_url"),
        product_or_offer: watch("next_offer"),
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
    setFieldOrigins(applied.origins as never);
  };

  return (
    <div className="space-y-4 rounded-xl border border-[var(--color-publiora-border)] p-4">
      <h3 className="text-sm font-semibold text-[var(--color-publiora-black)]">
        Ide & Produk
      </h3>

      <div>
        <Label htmlFor="idea_text">Ide lead magnet</Label>
        <Input
          id="idea_text"
          placeholder="Contoh: Checklist 7 hari untuk audit funnel SaaS"
          {...register("idea_text")}
        />
        {errors.idea_text && (
          <p className="mt-1 text-xs text-red-600">{errors.idea_text.message}</p>
        )}
      </div>

      <OfferPicker
        label="Produk yang akan dipromosikan"
        value={selectedOffer}
        onChange={handleOffer}
        allowNone
        noneLabel="Belum ada produk"
      />
      {noOffer && !selectedOffer ? (
        <p className="text-xs text-[var(--color-medium-gray)]">
          Tidak masalah. Strategist bisa membantu merumuskan penawaran nanti.
        </p>
      ) : null}

      <div>
        <Label htmlFor="lead_goal">Tujuan Lead Magnet</Label>
        <select
          id="lead_goal"
          className="h-9 w-full rounded-[var(--radius-input)] border border-[var(--color-publiora-border)] bg-white px-3 text-sm"
          {...register("lead_goal")}
        >
          <option value="">Pilih tujuan…</option>
          {LEAD_GOALS.map((g) => (
            <option key={g} value={g}>
              {LEAD_GOAL_LABELS[g]}
            </option>
          ))}
        </select>
        {errors.lead_goal && (
          <p className="mt-1 text-xs text-red-600">{errors.lead_goal.message}</p>
        )}
      </div>

      <div>
        <Label htmlFor="traffic_source">Sumber traffic (opsional)</Label>
        <select
          id="traffic_source"
          className="h-9 w-full rounded-[var(--radius-input)] border border-[var(--color-publiora-border)] bg-white px-3 text-sm"
          {...register("traffic_source")}
        >
          <option value="">Belum ditentukan</option>
          {TRAFFIC_SOURCE_OPTIONS.map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </select>
      </div>

      <div>
        <Label htmlFor="post_read_action">Aksi setelah membaca (opsional)</Label>
        <select
          id="post_read_action"
          className="h-9 w-full rounded-[var(--radius-input)] border border-[var(--color-publiora-border)] bg-white px-3 text-sm"
          {...register("post_read_action")}
        >
          <option value="">Ikuti tujuan lead / tentukan nanti</option>
          {CTA_GOALS.map((g) => (
            <option key={g} value={g}>
              {CTA_GOAL_LABELS_ID[g]}
            </option>
          ))}
        </select>
      </div>

      {needsUrl && !selectedOffer?.destination_url ? (
        <div>
          <Label htmlFor="cta_url">URL tujuan</Label>
          <Input
            id="cta_url"
            placeholder="https://..."
            {...register("cta_url")}
          />
          {errors.cta_url && (
            <p className="mt-1 text-xs text-red-600">{errors.cta_url.message}</p>
          )}
        </div>
      ) : null}
    </div>
  );
}
