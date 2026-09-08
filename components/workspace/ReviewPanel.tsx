"use client";

import * as React from "react";
import {
  useProject,
  useOutline,
  useSections,
  useUpdateProject,
} from "@/lib/api/hooks";
import { useUiStore } from "@/store/projectStore";
import { Button } from "@/components/ui/Button";
import { ReviewChecklist } from "@/components/workspace/ReviewChecklist";
import { AiQualityReview } from "@/components/workspace/AiQualityReview";
import { CtaComposer } from "@/components/workspace/CtaComposer";
import { TitleSuggestions } from "@/components/workspace/TitleSuggestions";
import { PreviewPanel } from "@/components/workspace/PreviewPanel";
import {
  ClipboardCheck,
  Rocket,
  Sparkles,
} from "lucide-react";
import type { ProjectWorkflowStep, ProjectWorkflowState } from "@/types/workflow";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// ReviewPanel
// ---------------------------------------------------------------------------

interface ReviewPanelProps {
  projectId: string;
  workflow: ProjectWorkflowState | null;
  onNavigate?: (step: ProjectWorkflowStep) => void;
  onContinueToPublish?: () => void;
}

export function ReviewPanel({
  projectId,
  workflow,
  onNavigate,
  onContinueToPublish,
}: ReviewPanelProps) {
  const { data: project } = useProject(projectId);
  const { data: outline } = useOutline(projectId);
  const { data: sections } = useSections(projectId);
  const updateProject = useUpdateProject();
  const pushToast = useUiStore((s) => s.pushToast);

  const checks = workflow?.checks ?? [];
  const blockerCount = checks.filter((c) => c.severity === "blocker").length;
  const warningCount = checks.filter((c) => c.severity === "warning").length;
  const passCount = checks.filter((c) => c.severity === "pass").length;

  // Active tab for review checks: system checklist vs AI audit
  const [activeReviewTab, setActiveReviewTab] = React.useState<"system" | "ai">("system");

  // Local title / subtitle editing
  const [title, setTitle] = React.useState(project?.title ?? "");
  const [subtitle, setSubtitle] = React.useState(project?.subtitle ?? "");

  React.useEffect(() => {
    if (project) {
      setTitle(project.title ?? "");
      setSubtitle(project.subtitle ?? "");
    }
  }, [project]);

  const saveTitleAndSubtitle = async () => {
    try {
      await updateProject.mutateAsync({
        id: projectId,
        patch: { title, subtitle: subtitle || undefined },
      });
      pushToast({ title: "Judul dan subjudul disimpan", variant: "success" });
    } catch {
      pushToast({ title: "Gagal menyimpan judul", variant: "danger" });
    }
  };

  const titleDirty = title !== (project?.title ?? "") || subtitle !== (project?.subtitle ?? "");

  return (
    <div className="flex flex-col lg:flex-row h-full overflow-y-auto lg:overflow-hidden bg-white">
      {/* Main Column: Checklists, AI Audit, Title & Subtitle, CTA */}
      <div className="flex-1 min-w-0 lg:overflow-y-auto p-4 pb-12 sm:p-6 sm:pb-8 lg:p-8 space-y-8">
        {/* Stage Header */}
        <div className="space-y-1 pb-4 border-b border-[var(--color-publiora-border)]">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold text-[var(--color-publiora-blue)] bg-blue-50 px-2 py-0.5 rounded-full">
              Tahap 4 dari 5: Tinjauan Naskah
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-[var(--color-publiora-black)] tracking-tight">
            Tinjau &amp; Kurasi Ebook
          </h2>
          <p className="text-xs sm:text-sm text-[var(--color-deep-gray)] leading-relaxed">
            Periksa kelayakan naskah, sempurnakan judul &amp; CTA, dan lakukan audit kualitas sebelum diterbitkan.
          </p>
        </div>

        {/* 1. Quality & Readiness Review: Segmented Tab */}
        <section className="space-y-4">
          <div>
            <h3 className="text-sm sm:text-base font-bold text-[var(--color-publiora-black)]">
              Pemeriksaan &amp; Audit Kualitas
            </h3>
            <p className="text-xs text-[var(--color-medium-gray)] mt-0.5">
              Pilih antara checklist teknis otomatis (syarat terbit) atau audit redaksi AI naskah secara mendalam.
            </p>
          </div>

          {/* Segmented Tab Switch */}
          <div className="flex items-center p-1 bg-gray-100/90 rounded-xl border border-gray-200/70 gap-1">
            <button
              type="button"
              onClick={() => setActiveReviewTab("system")}
              className={cn(
                "flex-1 min-w-0 flex items-center justify-center gap-1.5 sm:gap-2 py-2 px-2 sm:px-3 rounded-lg text-xs font-semibold transition-all",
                activeReviewTab === "system"
                  ? "bg-white text-[var(--color-publiora-black)] shadow-xs border border-black/5"
                  : "text-[var(--color-deep-gray)] hover:text-black",
              )}
            >
              <ClipboardCheck className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-[var(--color-publiora-blue)] shrink-0" />
              <span className="truncate hidden sm:inline">Checklist Sistem (Kesiapan Terbit)</span>
              <span className="truncate sm:hidden">Checklist</span>
              {blockerCount > 0 ? (
                <span className="bg-red-100 text-red-700 text-[10px] font-bold px-1.5 py-0.5 rounded-full shrink-0">
                  <span className="hidden sm:inline">{blockerCount} kendala</span>
                  <span className="sm:hidden">{blockerCount}</span>
                </span>
              ) : warningCount > 0 ? (
                <span className="bg-amber-100 text-amber-700 text-[10px] font-bold px-1.5 py-0.5 rounded-full shrink-0">
                  <span className="hidden sm:inline">{warningCount} peringatan</span>
                  <span className="sm:hidden">{warningCount}</span>
                </span>
              ) : (
                <span className="bg-emerald-100 text-emerald-700 text-[10px] font-bold px-1.5 py-0.5 rounded-full shrink-0">
                  Siap
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setActiveReviewTab("ai")}
              className={cn(
                "flex-1 min-w-0 flex items-center justify-center gap-1.5 sm:gap-2 py-2 px-2 sm:px-3 rounded-lg text-xs font-semibold transition-all",
                activeReviewTab === "ai"
                  ? "bg-white text-[var(--color-publiora-black)] shadow-xs border border-black/5"
                  : "text-[var(--color-deep-gray)] hover:text-black",
              )}
            >
              <Sparkles className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-purple-600 shrink-0" />
              <span className="truncate hidden sm:inline">Audit Redaksi AI</span>
              <span className="truncate sm:hidden">Audit AI</span>
              <span className="bg-purple-100 text-purple-700 text-[10px] font-bold px-1.5 py-0.5 rounded-full shrink-0">
                Opsional
              </span>
            </button>
          </div>

          {/* Tab Content */}
          {activeReviewTab === "system" ? (
            <div className="space-y-3">
              <ReviewChecklist
                checks={checks}
                sections={sections}
                outlineSections={outline?.sections}
                onNavigateCheck={onNavigate}
              />
            </div>
          ) : (
            <AiQualityReview
              projectId={projectId}
              sections={sections}
              onNavigateSection={(secId) => onNavigate?.("write")}
            />
          )}
        </section>

        {/* 2. Final Title & Subtitle */}
        <section
          id="review-title-section"
          className="space-y-4 pt-4 border-t border-[var(--color-publiora-border)] scroll-mt-6"
        >
          <div>
            <h3 className="text-sm sm:text-base font-bold text-[var(--color-publiora-black)]">
              Judul &amp; Subjudul Final
            </h3>
            <p className="text-xs text-[var(--color-medium-gray)] mt-0.5">
              Pastikan judul menarik dan menjanjikan hasil nyata bagi pembaca.
            </p>
          </div>

          <div className="rounded-2xl border border-[var(--color-publiora-border)] bg-white p-4 sm:p-5 space-y-4 shadow-xs">
            <div>
              <label
                htmlFor="review-title-input"
                className="block text-xs font-bold text-[var(--color-deep-gray)] mb-1"
              >
                Judul Ebook <span className="text-red-500">*</span>
              </label>
              <input
                id="review-title-input"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Judul ebook yang menarik…"
                className="h-10 w-full rounded-xl border border-[var(--color-publiora-border)] bg-white px-3.5 text-sm text-[var(--color-deep-gray)] placeholder:text-[var(--color-medium-gray)] focus:border-[var(--color-publiora-blue)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-publiora-blue)] transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[var(--color-deep-gray)] mb-1">
                Subjudul (Opsional)
              </label>
              <input
                type="text"
                value={subtitle}
                onChange={(e) => setSubtitle(e.target.value)}
                placeholder="Subjudul penjelas nilai atau cara eksekusi…"
                className="h-10 w-full rounded-xl border border-[var(--color-publiora-border)] bg-white px-3.5 text-sm text-[var(--color-deep-gray)] placeholder:text-[var(--color-medium-gray)] focus:border-[var(--color-publiora-blue)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-publiora-blue)] transition-colors"
              />
            </div>

            {titleDirty && (
              <div className="pt-1">
                <Button
                  size="sm"
                  variant="primary"
                  onClick={saveTitleAndSubtitle}
                  loading={updateProject.isPending}
                >
                  Simpan Perubahan Judul
                </Button>
              </div>
            )}

            <div className="pt-3 border-t border-gray-100">
              <TitleSuggestions projectId={projectId} />
            </div>
          </div>
        </section>

        {/* 3. Final Call-to-Action (CTA) */}
        {project && (
          <section
            id="review-cta-section"
            className="space-y-4 pt-4 border-t border-[var(--color-publiora-border)] scroll-mt-6"
          >
            <div>
              <h3 className="text-sm sm:text-base font-bold text-[var(--color-publiora-black)]">
                Pengaturan Call-to-Action (CTA)
              </h3>
              <p className="text-xs text-[var(--color-medium-gray)] mt-0.5">
                Tentukan penawaran atau langkah konversi yang pembaca ambil setelah membaca ebook.
              </p>
            </div>

            <CtaComposer projectId={projectId} project={project} />
          </section>
        )}
      </div>

      {/* Right Sidebar: Status Kesiapan, Pratinjau, dan Aksi Terbit */}
      <div className="w-full lg:w-[360px] xl:w-[380px] shrink-0 border-t lg:border-t-0 lg:border-l border-[var(--color-publiora-border)] bg-gray-50/70 p-4 pb-24 sm:p-6 sm:pb-6 space-y-5 lg:overflow-y-auto">
        {/* Card 1: Status Kesiapan & Tombol Terbit */}
        <div className="bg-white rounded-2xl border border-[var(--color-publiora-border)] p-4 sm:p-5 shadow-xs space-y-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-[var(--color-publiora-blue)] grid place-items-center shrink-0">
              <ClipboardCheck className="h-4 w-4" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-[var(--color-publiora-black)]">
                Kesiapan Ebook
              </h4>
              <p className="text-xs text-[var(--color-medium-gray)]">
                Status kelayakan penerbitan naskah
              </p>
            </div>
          </div>

          {/* Badges */}
          <div className="grid grid-cols-3 gap-2">
            <SummaryBadge
              label="Kendala"
              count={blockerCount}
              variant="danger"
            />
            <SummaryBadge
              label="Peringatan"
              count={warningCount}
              variant="warning"
            />
            <SummaryBadge
              label="Lolos"
              count={passCount}
              variant="success"
            />
          </div>

          {/* Status Message */}
          {blockerCount > 0 ? (
            <div className="rounded-xl bg-red-50/70 border border-red-200/70 p-3 text-xs text-red-800 leading-relaxed">
              <span className="font-bold">Ada {blockerCount} kendala utama.</span> Selesaikan seluruh kendala sebelum naskah dapat diterbitkan.
            </div>
          ) : warningCount > 0 ? (
            <div className="rounded-xl bg-amber-50/70 border border-amber-200/70 p-3 text-xs text-amber-800 leading-relaxed">
              <span className="font-bold">Semua kendala lolos!</span> Terdapat {warningCount} peringatan opsional, Anda tetap dapat melanjutkan ke tahap penerbitan.
            </div>
          ) : (
            <div className="rounded-xl bg-emerald-50/70 border border-emerald-200/70 p-3 text-xs text-emerald-800 leading-relaxed">
              <span className="font-bold">Naskah lengkap!</span> Semua pemeriksaan berhasil lolos. Siap untuk diterbitkan.
            </div>
          )}

          {/* Primary Action Button */}
          {onContinueToPublish && (
            <Button
              variant="gold"
              size="md"
              className="w-full justify-center shadow-xs"
              disabled={blockerCount > 0}
              onClick={onContinueToPublish}
              title={
                blockerCount > 0
                  ? `Selesaikan ${blockerCount} kendala sebelum menerbitkan`
                  : undefined
              }
            >
              <Rocket className="h-4 w-4 mr-1.5" />
              {blockerCount > 0
                ? `Selesaikan ${blockerCount} Kendala`
                : "Lanjut ke Terbit"}
            </Button>
          )}
        </div>

        {/* Card 2: Pratinjau Naskah */}
        <PreviewPanel projectId={projectId} />

        {/* Card 3: Panduan Tinjauan */}
        <div className="rounded-2xl border border-[var(--color-publiora-border)] bg-blue-50/40 p-4 space-y-2 text-xs text-[var(--color-deep-gray)] leading-relaxed">
          <div className="font-bold text-[var(--color-publiora-blue)] flex items-center gap-1.5">
            <Sparkles className="h-3.5 w-3.5" />
            Panduan Tahap Tinjau
          </div>
          <ul className="space-y-1.5 text-[11px] text-[var(--color-deep-gray)]">
            <li>• <strong>Checklist Sistem:</strong> Memeriksa syarat teknis penerbitan (judul, isi bab, URL CTA). Wajib bebas dari kendala merah.</li>
            <li>• <strong>Audit Redaksi AI:</strong> Konsultasi opsional untuk mengecek alur antar bab, kesesuaian audiens, dan gaya bahasa.</li>
            <li>• <strong>CTA &amp; Penawaran:</strong> Pastikan teks ajakan aksi dan tautan tujuan CTA sudah terisi dengan benar.</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Summary badge helper
// ---------------------------------------------------------------------------

function SummaryBadge({
  label,
  count,
  variant,
}: {
  label: string;
  count: number;
  variant: "danger" | "warning" | "success";
}) {
  const bg =
    variant === "danger"
      ? "bg-red-50 border-red-200"
      : variant === "warning"
        ? "bg-amber-50 border-amber-200"
        : "bg-green-50 border-green-200";

  const textColor =
    variant === "danger"
      ? "text-red-700"
      : variant === "warning"
        ? "text-amber-700"
        : "text-green-700";

  return (
    <div
      className={cn(
        "rounded-xl border p-2 text-center",
        bg,
      )}
    >
      <div className={cn("text-lg font-bold leading-none", textColor)}>
        {count}
      </div>
      <div className={cn("text-[10px] font-bold mt-1 uppercase tracking-wider", textColor)}>
        {label}
      </div>
    </div>
  );
}
