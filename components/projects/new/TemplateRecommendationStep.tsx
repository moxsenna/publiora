"use client";

import * as React from "react";
import { rankTemplates, type RankedTemplate } from "@/lib/templates/recommendation";
import { SYSTEM_TEMPLATES } from "@/lib/templates-catalog";
import { TemplateOptionCard } from "@/components/projects/new/TemplateOptionCard";
import type { WizardFormValues } from "@/components/projects/new/wizard-types";
import type { EbookType } from "@/types/project";

export function TemplateRecommendationStep({
  values,
  selectedId,
  onSelect,
}: {
  values: WizardFormValues;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
}) {
  const [showAll, setShowAll] = React.useState(false);

  const ranked: RankedTemplate[] = React.useMemo(() => {
    const pick = <T extends string>(value: T | "" | undefined | null) =>
      value ? (value as Exclude<T, "">) : undefined;
    return rankTemplates(
      {
        ebookType: values.ebook_type as EbookType,
        leadGoal: pick(values.lead_goal),
        bonusRole: pick(values.bonus_role),
        salesPositioning: pick(values.sales_positioning),
        desiredOutcome: values.desired_outcome || "",
        primaryProblem: values.primary_problem || "",
      },
      SYSTEM_TEMPLATES,
    );
  }, [values]);

  const recommended = ranked.filter((r) => r.recommended);
  const others = ranked.filter((r) => !r.recommended);
  const visible = showAll ? ranked : recommended.length > 0 ? recommended : ranked.slice(0, 3);

  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-lg font-bold text-[var(--color-publiora-black)]">
          Format yang direkomendasikan
        </h2>
        <p className="text-sm text-[var(--color-medium-gray)] mt-1">
          Berdasarkan tujuan dan brief Anda, format berikut paling sesuai.
        </p>
      </div>

      <div className="grid sm:grid-cols-2 gap-3">
        {visible.map((item) => (
          <TemplateOptionCard
            key={item.template.id}
            item={item}
            selected={selectedId === item.template.id}
            onSelect={() => onSelect(item.template.id)}
          />
        ))}
        <button
          type="button"
          aria-pressed={selectedId === null}
          onClick={() => onSelect(null)}
          className={`p-4 rounded-xl border-2 text-left bg-white min-h-[44px] ${
            selectedId === null
              ? "border-[var(--color-publiora-black)]"
              : "border-[var(--color-publiora-border)]"
          }`}
        >
          <div className="text-sm font-semibold">Blank</div>
          <p className="mt-1 text-xs text-[var(--color-medium-gray)]">
            Mulai dari kosong tanpa struktur default.
          </p>
        </button>
      </div>

      {!showAll && others.length > 0 && (
        <button
          type="button"
          className="text-sm font-medium text-[var(--color-publiora-blue)] underline-offset-2 hover:underline"
          onClick={() => setShowAll(true)}
        >
          Lihat format lainnya
        </button>
      )}
    </section>
  );
}
