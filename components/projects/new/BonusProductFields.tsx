"use client";

import type { FieldErrors, UseFormRegister } from "react-hook-form";
import { Input, Label } from "@/components/ui/Input";
import {
  BONUS_ROLE_LABELS,
  USAGE_MOMENT_OPTIONS,
} from "@/lib/projects/project-type-copy";
import { BONUS_ROLES } from "@/types/project";
import type { WizardFormValues } from "@/components/projects/new/wizard-types";

export function BonusProductFields({
  register,
  errors,
}: {
  register: UseFormRegister<WizardFormValues>;
  errors: FieldErrors<WizardFormValues>;
}) {
  return (
    <div className="space-y-4 rounded-xl border border-[var(--color-publiora-border)] p-4">
      <h3 className="text-sm font-semibold text-[var(--color-publiora-black)]">
        Konteks Bonus Pembelian
      </h3>

      <div>
        <Label htmlFor="parent_product">Produk utama</Label>
        <Input
          id="parent_product"
          placeholder="Contoh: Kelas TikTok Affiliate untuk Pemula"
          aria-invalid={!!errors.parent_product}
          {...register("parent_product")}
        />
        {errors.parent_product && (
          <p className="mt-1 text-xs text-red-600">
            {errors.parent_product.message}
          </p>
        )}
      </div>

      <div>
        <Label htmlFor="bonus_role">Fungsi bonus</Label>
        <select
          id="bonus_role"
          className="h-9 w-full rounded-[var(--radius-input)] border border-[var(--color-publiora-border)] bg-white px-3 text-sm"
          {...register("bonus_role")}
        >
          <option value="">Pilih fungsi…</option>
          {BONUS_ROLES.map((r) => (
            <option key={r} value={r}>
              {BONUS_ROLE_LABELS[r]}
            </option>
          ))}
        </select>
        {errors.bonus_role && (
          <p className="mt-1 text-xs text-red-600">
            {errors.bonus_role.message}
          </p>
        )}
      </div>

      <div>
        <Label htmlFor="usage_moment">Kapan bonus digunakan?</Label>
        <select
          id="usage_moment"
          className="h-9 w-full rounded-[var(--radius-input)] border border-[var(--color-publiora-border)] bg-white px-3 text-sm"
          {...register("usage_moment")}
        >
          <option value="">Pilih momen…</option>
          {USAGE_MOMENT_OPTIONS.map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </select>
        {errors.usage_moment && (
          <p className="mt-1 text-xs text-red-600">
            {errors.usage_moment.message}
          </p>
        )}
        <p className="mt-1 text-xs text-[var(--color-medium-gray)]">
          Hasil yang diberikan (di atas) adalah hasil bonus, bukan hasil penuh
          produk utama.
        </p>
      </div>
    </div>
  );
}
