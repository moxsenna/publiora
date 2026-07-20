"use client";

import {
  BONUS_ROLE_LABELS,
  CTA_GOAL_LABELS_ID,
  EBOOK_TYPE_LABELS,
  LEAD_GOAL_LABELS,
  SALES_POSITIONING_LABELS,
} from "@/lib/projects/project-type-copy";
import { getTemplateById } from "@/lib/templates-catalog";
import {
  ReviewRow,
  ReviewSection,
} from "@/components/projects/new/ReviewSection";
import type { WizardFormValues } from "@/components/projects/new/wizard-types";

export function ProjectReviewStep({
  values,
  onEditStep,
}: {
  values: WizardFormValues;
  onEditStep: (step: number) => void;
}) {
  const tpl = getTemplateById(values.template_id);
  const objections = (values.buyer_objections_text ?? "")
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);

  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-lg font-bold text-[var(--color-publiora-black)]">
          Tinjau proyek
        </h2>
        <p className="text-sm text-[var(--color-medium-gray)] mt-1">
          Periksa brief dan format sebelum membuat proyek.
        </p>
      </div>

      <ReviewSection title="Tujuan" onEdit={() => onEditStep(1)}>
        <ReviewRow
          label="Tipe"
          value={EBOOK_TYPE_LABELS[values.ebook_type]}
        />
        {values.ebook_type === "lead_magnet" && values.lead_goal && (
          <ReviewRow
            label="Tujuan"
            value={LEAD_GOAL_LABELS[values.lead_goal]}
          />
        )}
      </ReviewSection>

      <ReviewSection title="Audiens & janji" onEdit={() => onEditStep(2)}>
        <ReviewRow label="Topik" value={values.topic} />
        <ReviewRow label="Target pembaca" value={values.audience} />
        <ReviewRow label="Masalah utama" value={values.primary_problem} />
        <ReviewRow
          label="Hasil yang diberikan"
          value={values.desired_outcome}
        />
      </ReviewSection>

      <ReviewSection title="Konteks bisnis" onEdit={() => onEditStep(2)}>
        {values.ebook_type === "lead_magnet" && (
          <>
            <ReviewRow label="Sumber traffic" value={values.traffic_source} />
            <ReviewRow label="Offer lanjutan" value={values.next_offer} />
            {values.post_read_action && (
              <ReviewRow
                label="Aksi setelah membaca"
                value={CTA_GOAL_LABELS_ID[values.post_read_action]}
              />
            )}
            <ReviewRow label="Tautan" value={values.cta_url} />
          </>
        )}
        {values.ebook_type === "bonus_product" && (
          <>
            <ReviewRow label="Produk utama" value={values.parent_product} />
            {values.bonus_role && (
              <ReviewRow
                label="Fungsi bonus"
                value={BONUS_ROLE_LABELS[values.bonus_role]}
              />
            )}
            <ReviewRow
              label="Waktu penggunaan"
              value={values.usage_moment}
            />
          </>
        )}
        {values.ebook_type === "sellable_ebook" && (
          <>
            {values.sales_positioning && (
              <ReviewRow
                label="Posisi produk"
                value={SALES_POSITIONING_LABELS[values.sales_positioning]}
              />
            )}
            {objections.length > 0 && (
              <ReviewRow
                label="Keberatan pembeli"
                value={objections.join("; ")}
              />
            )}
          </>
        )}
      </ReviewSection>

      <ReviewSection title="Format" onEdit={() => onEditStep(3)}>
        <ReviewRow
          label="Template"
          value={tpl?.name ?? "Blank"}
        />
        {tpl && (
          <>
            <ReviewRow label="Depth" value={tpl.depth} />
            <ReviewRow
              label="Estimasi bagian"
              value={String(tpl.default_section_count)}
            />
          </>
        )}
      </ReviewSection>

      <ReviewSection title="Metadata" onEdit={() => onEditStep(2)}>
        <ReviewRow
          label="Judul sementara"
          value={values.working_title || "(otomatis dari topik)"}
        />
        <ReviewRow label="Penulis" value={values.author} />
        <ReviewRow label="Niche" value={values.niche} />
        <ReviewRow
          label="Gaya bahasa"
          value={values.tone || "Praktis, jelas"}
        />
      </ReviewSection>
    </section>
  );
}
