"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft } from "lucide-react";
import { useCreateProject, useMe, useOffer } from "@/lib/api/hooks";
import { useUiStore } from "@/store/projectStore";
import { Button } from "@/components/ui/Button";
import { Card, CardBody } from "@/components/ui/Card";
import { DEFAULT_TONE } from "@/lib/projects/project-create-defaults";
import { resolveAuthorFallback } from "@/lib/projects/project-create-defaults";
import { isTemplateCompatible } from "@/lib/templates-catalog";
import { NewProjectStepProgress } from "@/components/projects/new/NewProjectStepProgress";
import { ProjectTypeStep } from "@/components/projects/new/ProjectTypeStep";
import { CommonBriefFields } from "@/components/projects/new/CommonBriefFields";
import { LeadMagnetFields } from "@/components/projects/new/LeadMagnetFields";
import { BonusProductFields } from "@/components/projects/new/BonusProductFields";
import { SellableEbookFields } from "@/components/projects/new/SellableEbookFields";
import { TemplateRecommendationStep } from "@/components/projects/new/TemplateRecommendationStep";
import { TypeChangeConfirmDialog } from "@/components/projects/new/TypeChangeConfirmDialog";
import {
  hasTypeSpecificDirty,
  step2FieldsForType,
  toCreateProjectV3,
  wizardFormSchema,
  type WizardFormValues,
} from "@/components/projects/new/wizard-types";
import type { EbookType } from "@/types/project";
import type { Offer } from "@/types/offer";
import type { FieldOrigin } from "@/lib/offers/prefill";

export function NewProjectWizard() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const create = useCreateProject();
  const { data: me } = useMe();
  const pushToast = useUiStore((s) => s.pushToast);
  const [step, setStep] = React.useState(1);
  const [submitError, setSubmitError] = React.useState<string | null>(null);
  const [pendingType, setPendingType] = React.useState<EbookType | null>(null);
  const [selectedOffer, setSelectedOffer] = React.useState<Offer | null>(null);
  const [fieldOrigins, setFieldOrigins] = React.useState<
    Partial<Record<string, FieldOrigin>>
  >({});
  const [offerLocked, setOfferLocked] = React.useState(false);
  const errorSummaryRef = React.useRef<HTMLDivElement>(null);

  const presetOfferId = searchParams.get("offer_id");
  const presetType = searchParams.get("ebook_type") as EbookType | null;
  const { data: presetOfferData } = useOffer(presetOfferId ?? "");

  const form = useForm<WizardFormValues>({
    resolver: zodResolver(wizardFormSchema),
    defaultValues: {
      ebook_type:
        presetType === "lead_magnet" ||
        presetType === "bonus_product" ||
        presetType === "sellable_ebook"
          ? presetType
          : "lead_magnet",
      template_id: null,
      idea_text: "",
      topic: "",
      audience: "",
      primary_problem: "",
      desired_outcome: "",
      niche: "",
      tone: DEFAULT_TONE,
      working_title: "",
      author: "",
      additional_notes: "",
      offer_mode: "none",
      selected_offer_id: null,
      no_offer: false,
      lead_goal: undefined,
      traffic_source: "",
      next_offer: "",
      post_read_action: undefined,
      cta_url: "",
      parent_product: "",
      bonus_role: undefined,
      bonus_intent: "",
      usage_moment: "",
      sellable_mode: undefined,
      sales_positioning: undefined,
      buyer_objections_text: "",
    },
    mode: "onBlur",
  });

  const {
    register,
    handleSubmit,
    setValue,
    getValues,
    watch,
    trigger,
    reset,
    formState: { errors, isSubmitting },
  } = form;

  const ebookType = watch("ebook_type");
  const templateId = watch("template_id");
  const values = watch();

  React.useEffect(() => {
    if (!me) return;
    const current = getValues("author");
    if (current?.trim()) return;
    const author = resolveAuthorFallback({
      full_name: me.profile?.name,
      display_name: me.profile?.name,
      email: me.profile?.email ?? me.user?.email,
    });
    setValue("author", author, { shouldValidate: false });
  }, [me, getValues, setValue]);

  React.useEffect(() => {
    if (!presetOfferData?.offer || selectedOffer) return;
    const offer = presetOfferData.offer;
    setSelectedOffer(offer);
    setOfferLocked(true);
    setValue("selected_offer_id", offer.id);
    setValue("offer_mode", "existing");
    setValue("parent_product", offer.name);
    setValue("next_offer", offer.name);
    if (offer.target_audience) setValue("audience", offer.target_audience);
    if (offer.niche) setValue("niche", offer.niche);
    if (offer.destination_url) setValue("cta_url", offer.destination_url);
    if (offer.primary_problem) setValue("primary_problem", offer.primary_problem);
  }, [presetOfferData, selectedOffer, setValue]);

  const applyTypeChange = (next: EbookType) => {
    const current = getValues();
    reset({
      ...current,
      ebook_type: next,
      template_id: isTemplateCompatible(current.template_id, next)
        ? current.template_id
        : null,
      lead_goal: undefined,
      traffic_source: "",
      next_offer: "",
      post_read_action: undefined,
      cta_url: "",
      parent_product: "",
      bonus_role: undefined,
      bonus_intent: "",
      usage_moment: "",
      sellable_mode: undefined,
      sales_positioning: undefined,
      buyer_objections_text: "",
      selected_offer_id: offerLocked ? current.selected_offer_id : null,
      offer_mode: offerLocked ? current.offer_mode : "none",
      no_offer: false,
    });
    if (!offerLocked) setSelectedOffer(null);
    setPendingType(null);
  };

  const onSelectType = (next: EbookType) => {
    if (next === ebookType) return;
    if (hasTypeSpecificDirty(getValues(), ebookType)) {
      setPendingType(next);
      return;
    }
    applyTypeChange(next);
  };

  const goNext = async () => {
    setSubmitError(null);
    if (step === 1) {
      const ok = await trigger("ebook_type");
      if (!ok) {
        errorSummaryRef.current?.focus();
        return;
      }
      setStep(2);
      return;
    }
    if (step === 2) {
      const ok = await trigger(step2FieldsForType(ebookType));
      if (!ok) {
        errorSummaryRef.current?.focus();
        return;
      }
      setStep(3);
    }
  };

  const goBack = () => {
    setSubmitError(null);
    setStep((s) => Math.max(1, s - 1));
  };

  const onCreate = handleSubmit(async (data) => {
    setSubmitError(null);
    try {
      const payload = toCreateProjectV3(data, selectedOffer);
      const project = await create.mutateAsync(payload);
      pushToast({ title: "Proyek berhasil dibuat", variant: "success" });
      router.push(`/projects/${project.id}?stage=strategy`);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Gagal membuat proyek";
      setSubmitError(message);
      pushToast({ title: "Gagal membuat project", variant: "danger" });
      errorSummaryRef.current?.focus();
    }
  });

  const hasStepErrors =
    step === 2 &&
    Object.keys(errors).some((k) =>
      step2FieldsForType(ebookType).includes(k as keyof WizardFormValues),
    );

  return (
    <div className="max-w-4xl mx-auto px-3 sm:px-5 py-5 space-y-5 overflow-x-hidden">
      <Link href="/projects">
        <Button variant="ghost" size="sm">
          <ArrowLeft className="h-3.5 w-3.5" />
          Kembali ke proyek
        </Button>
      </Link>

      <div>
        <h1 className="text-xl font-bold text-[var(--color-publiora-black)]">
          Buat Proyek Baru
        </h1>
        <p className="text-sm text-[var(--color-medium-gray)] mt-0.5">
          Tujuan → Ide & Produk → Format. Pilih produk sekali, konteks ikut.
        </p>
      </div>

      <NewProjectStepProgress step={step} maxStep={3} />

      {(hasStepErrors || submitError) && (
        <div
          ref={errorSummaryRef}
          tabIndex={-1}
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
        >
          {submitError ?? "Perbaiki field yang wajib diisi sebelum lanjut."}
        </div>
      )}

      <Card>
        <CardBody className="space-y-5">
          {step === 1 && (
            <ProjectTypeStep value={ebookType} onChange={onSelectType} />
          )}

          {step === 2 && (
            <section className="space-y-4">
              <div>
                <h2 className="text-lg font-bold text-[var(--color-publiora-black)]">
                  Ide & Produk
                </h2>
                <p className="text-sm text-[var(--color-medium-gray)] mt-1">
                  Pilih penawaran bila relevan, lalu jelaskan ide ebook.
                </p>
              </div>
              {ebookType === "lead_magnet" && (
                <LeadMagnetFields
                  register={register}
                  errors={errors}
                  watch={watch}
                  setValue={setValue}
                  selectedOffer={selectedOffer}
                  onSelectedOfferChange={(o) => {
                    setOfferLocked(false);
                    setSelectedOffer(o);
                  }}
                  fieldOrigins={fieldOrigins}
                  setFieldOrigins={setFieldOrigins}
                />
              )}
              {ebookType === "bonus_product" && (
                <BonusProductFields
                  register={register}
                  errors={errors}
                  watch={watch}
                  setValue={setValue}
                  selectedOffer={selectedOffer}
                  onSelectedOfferChange={(o) => {
                    setOfferLocked(false);
                    setSelectedOffer(o);
                  }}
                  fieldOrigins={fieldOrigins}
                  setFieldOrigins={setFieldOrigins}
                />
              )}
              {ebookType === "sellable_ebook" && (
                <SellableEbookFields
                  register={register}
                  errors={errors}
                  watch={watch}
                  setValue={setValue}
                  selectedOffer={selectedOffer}
                  onSelectedOfferChange={(o) => {
                    setOfferLocked(false);
                    setSelectedOffer(o);
                  }}
                />
              )}
              <CommonBriefFields register={register} errors={errors} compact />
            </section>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <TemplateRecommendationStep
                values={values}
                selectedId={templateId}
                onSelect={(id) =>
                  setValue("template_id", id, { shouldValidate: true })
                }
              />
              <div className="rounded-lg border border-[var(--color-publiora-border)] p-3 text-sm space-y-1">
                <div className="font-medium">Ringkasan</div>
                <div>Tipe: {ebookType}</div>
                {selectedOffer ? (
                  <div>Produk: {selectedOffer.name}</div>
                ) : (
                  <div>Produk: —</div>
                )}
                <div>
                  Ide:{" "}
                  {values.idea_text || values.topic || values.working_title || "—"}
                </div>
              </div>
            </div>
          )}

          <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-3 pt-2 border-t border-[var(--color-publiora-border)]">
            <Button
              type="button"
              variant="ghost"
              onClick={goBack}
              disabled={step === 1 || isSubmitting || create.isPending}
            >
              Kembali
            </Button>
            {step < 3 ? (
              <Button type="button" onClick={goNext}>
                Lanjutkan
              </Button>
            ) : (
              <Button
                type="button"
                onClick={onCreate}
                disabled={isSubmitting || create.isPending}
              >
                {isSubmitting || create.isPending
                  ? "Membuat proyek dan menyiapkan strategi..."
                  : "Buat Proyek"}
              </Button>
            )}
          </div>
        </CardBody>
      </Card>

      <TypeChangeConfirmDialog
        open={pendingType != null}
        currentType={ebookType}
        onCancel={() => setPendingType(null)}
        onConfirm={() => {
          if (pendingType) applyTypeChange(pendingType);
        }}
      />
    </div>
  );
}
