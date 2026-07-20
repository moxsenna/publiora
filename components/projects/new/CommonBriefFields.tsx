"use client";

import type { FieldErrors, UseFormRegister } from "react-hook-form";
import { Input, Label, Textarea } from "@/components/ui/Input";
import type { WizardFormValues } from "@/components/projects/new/wizard-types";

export function CommonBriefFields({
  register,
  errors,
  compact = false,
}: {
  register: UseFormRegister<WizardFormValues>;
  errors: FieldErrors<WizardFormValues>;
  compact?: boolean;
}) {
  return (
    <div className="space-y-4">
      {!compact ? (
        <>
          <div>
            <Label htmlFor="topic">Topik utama</Label>
            <Input
              id="topic"
              placeholder="Contoh: Membangun sistem lead generation B2B"
              aria-invalid={!!errors.topic}
              aria-describedby={errors.topic ? "topic-error" : undefined}
              {...register("topic")}
            />
            {errors.topic && (
              <p id="topic-error" className="mt-1 text-xs text-red-600">
                {errors.topic.message}
              </p>
            )}
          </div>

          <div>
            <Label htmlFor="audience">Target pembaca</Label>
            <Textarea
              id="audience"
              rows={2}
              placeholder="Contoh: Founder SaaS tahap awal yang belum punya tim marketing"
              aria-invalid={!!errors.audience}
              aria-describedby={errors.audience ? "audience-error" : undefined}
              {...register("audience")}
            />
            {errors.audience && (
              <p id="audience-error" className="mt-1 text-xs text-red-600">
                {errors.audience.message}
              </p>
            )}
          </div>

          <div>
            <Label htmlFor="primary_problem">Masalah utama</Label>
            <Textarea
              id="primary_problem"
              rows={2}
              placeholder="Contoh: Sulit mendapatkan lead berkualitas secara konsisten"
              aria-invalid={!!errors.primary_problem}
              aria-describedby={
                errors.primary_problem ? "primary_problem-error" : undefined
              }
              {...register("primary_problem")}
            />
            {errors.primary_problem && (
              <p id="primary_problem-error" className="mt-1 text-xs text-red-600">
                {errors.primary_problem.message}
              </p>
            )}
          </div>

          <div>
            <Label htmlFor="desired_outcome">Hasil yang ingin diberikan</Label>
            <Textarea
              id="desired_outcome"
              rows={2}
              placeholder="Contoh: Pembaca memiliki rencana lead generation 30 hari"
              aria-invalid={!!errors.desired_outcome}
              aria-describedby={
                errors.desired_outcome ? "desired_outcome-error" : undefined
              }
              {...register("desired_outcome")}
            />
            {errors.desired_outcome && (
              <p id="desired_outcome-error" className="mt-1 text-xs text-red-600">
                {errors.desired_outcome.message}
              </p>
            )}
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="niche">Niche</Label>
              <Input
                id="niche"
                placeholder="Contoh: B2B SaaS Marketing"
                aria-invalid={!!errors.niche}
                {...register("niche")}
              />
              {errors.niche && (
                <p className="mt-1 text-xs text-red-600">{errors.niche.message}</p>
              )}
            </div>
            <div>
              <Label htmlFor="tone">Gaya bahasa</Label>
              <Input
                id="tone"
                placeholder="Contoh: Praktis, taktis, dan ringkas"
                {...register("tone")}
              />
            </div>
          </div>
        </>
      ) : (
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="audience">Target pembaca (opsional)</Label>
            <Input
              id="audience"
              placeholder="Bisa diisi dari produk"
              {...register("audience")}
            />
          </div>
          <div>
            <Label htmlFor="niche">Niche (opsional)</Label>
            <Input id="niche" placeholder="Bisa diisi dari produk" {...register("niche")} />
          </div>
        </div>
      )}

      <details className="rounded-xl border border-[var(--color-publiora-border)] p-3">
        <summary className="cursor-pointer text-sm font-medium text-[var(--color-publiora-black)]">
          Detail tambahan
        </summary>
        <div className="mt-3 space-y-4">
          {compact ? (
            <>
              <div>
                <Label htmlFor="topic">Topik (opsional)</Label>
                <Input id="topic" {...register("topic")} />
              </div>
              <div>
                <Label htmlFor="primary_problem">Masalah utama (opsional)</Label>
                <Textarea id="primary_problem" rows={2} {...register("primary_problem")} />
              </div>
              <div>
                <Label htmlFor="desired_outcome">Hasil (opsional)</Label>
                <Textarea id="desired_outcome" rows={2} {...register("desired_outcome")} />
              </div>
              <div>
                <Label htmlFor="tone">Gaya bahasa</Label>
                <Input id="tone" {...register("tone")} />
              </div>
            </>
          ) : null}
          <div>
            <Label htmlFor="working_title">Judul sementara (opsional)</Label>
            <Input
              id="working_title"
              placeholder="Anda dapat membuat dan mengganti judul dengan AI di tahap berikutnya."
              {...register("working_title")}
            />
          </div>
          <div>
            <Label htmlFor="author">Penulis</Label>
            <Input
              id="author"
              aria-invalid={!!errors.author}
              {...register("author")}
            />
            {errors.author && (
              <p className="mt-1 text-xs text-red-600">{errors.author.message}</p>
            )}
          </div>
          <div>
            <Label htmlFor="additional_notes">Catatan tambahan (opsional)</Label>
            <Textarea
              id="additional_notes"
              rows={3}
              placeholder="Tambahkan batasan, pengalaman, contoh, atau konteks yang perlu diketahui AI."
              {...register("additional_notes")}
            />
          </div>
        </div>
      </details>
    </div>
  );
}
