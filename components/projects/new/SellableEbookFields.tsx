"use client";

import type { FieldErrors, UseFormRegister } from "react-hook-form";
import { Label, Textarea } from "@/components/ui/Input";
import { SALES_POSITIONING_LABELS } from "@/lib/projects/project-type-copy";
import { SALES_POSITIONINGS } from "@/types/project";
import type { WizardFormValues } from "@/components/projects/new/wizard-types";

export function SellableEbookFields({
  register,
  errors,
}: {
  register: UseFormRegister<WizardFormValues>;
  errors: FieldErrors<WizardFormValues>;
}) {
  return (
    <div className="space-y-4 rounded-xl border border-[var(--color-publiora-border)] p-4">
      <h3 className="text-sm font-semibold text-[var(--color-publiora-black)]">
        Konteks Ebook Berbayar
      </h3>

      <div>
        <Label htmlFor="sales_positioning">Posisi produk</Label>
        <select
          id="sales_positioning"
          className="h-9 w-full rounded-[var(--radius-input)] border border-[var(--color-publiora-border)] bg-white px-3 text-sm"
          {...register("sales_positioning")}
        >
          <option value="">Pilih posisi…</option>
          {SALES_POSITIONINGS.map((p) => (
            <option key={p} value={p}>
              {SALES_POSITIONING_LABELS[p]}
            </option>
          ))}
        </select>
        {errors.sales_positioning && (
          <p className="mt-1 text-xs text-red-600">
            {errors.sales_positioning.message}
          </p>
        )}
      </div>

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
