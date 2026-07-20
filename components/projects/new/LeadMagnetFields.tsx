"use client";

import type {
  FieldErrors,
  UseFormRegister,
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

const CTA_GOALS = Object.keys(CTA_GOAL_LABELS_ID) as CtaGoal[];

export function LeadMagnetFields({
  register,
  errors,
  watch,
}: {
  register: UseFormRegister<WizardFormValues>;
  errors: FieldErrors<WizardFormValues>;
  watch: UseFormWatch<WizardFormValues>;
}) {
  const postRead = watch("post_read_action");
  const needsUrl =
    !!postRead &&
    (CTA_URL_REQUIRED_GOALS as CtaGoal[]).includes(postRead as CtaGoal);

  return (
    <div className="space-y-4 rounded-xl border border-[var(--color-publiora-border)] p-4">
      <h3 className="text-sm font-semibold text-[var(--color-publiora-black)]">
        Konteks Lead Magnet
      </h3>

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
        <Label htmlFor="traffic_source">Sumber traffic</Label>
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
        <Label htmlFor="next_offer">
          Produk atau layanan lanjutan (opsional)
        </Label>
        <Input
          id="next_offer"
          placeholder="Apa yang ingin Anda tawarkan setelah pembaca mendapatkan manfaat?"
          {...register("next_offer")}
        />
      </div>

      <div>
        <Label htmlFor="post_read_action">Aksi setelah membaca</Label>
        <select
          id="post_read_action"
          className="h-9 w-full rounded-[var(--radius-input)] border border-[var(--color-publiora-border)] bg-white px-3 text-sm"
          {...register("post_read_action")}
        >
          <option value="">Pilih aksi…</option>
          {CTA_GOALS.map((g) => (
            <option key={g} value={g}>
              {CTA_GOAL_LABELS_ID[g]}
            </option>
          ))}
        </select>
        {errors.post_read_action && (
          <p className="mt-1 text-xs text-red-600">
            {errors.post_read_action.message}
          </p>
        )}
      </div>

      {needsUrl && (
        <div>
          <Label htmlFor="cta_url">Tautan tujuan</Label>
          <Input
            id="cta_url"
            type="url"
            placeholder="https://..."
            aria-invalid={!!errors.cta_url}
            {...register("cta_url")}
          />
          {errors.cta_url && (
            <p className="mt-1 text-xs text-red-600">{errors.cta_url.message}</p>
          )}
        </div>
      )}
    </div>
  );
}
