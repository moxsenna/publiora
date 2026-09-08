"use client";

import * as React from "react";
import { Button } from "@/components/ui/Button";
import { useCreditCosts } from "@/lib/api/hooks";
import { apiFetch } from "@/lib/api/client";
import { CREDIT_COSTS } from "@/lib/billing/plans";
import { reviewId } from "@/lib/i18n/id/review";
import type { AiQualityReviewResult } from "@/types/quality-review";
import { useUiStore } from "@/store/projectStore";
import { Sparkles, AlertCircle, CheckCircle2, ArrowRight, BookOpen, Lightbulb } from "lucide-react";
import { cn } from "@/lib/utils";

const CATEGORY_TRANSLATIONS: Record<string, string> = {
  "audience suitability": "Kesesuaian Audiens",
  "type/format mismatch": "Struktur & Format",
  "weak transitions": "Alur & Transisi",
  "repeated ideas": "Pengulangan Ide",
  "over-promotion": "Keseimbangan Promosi",
  "unsupported claims": "Klaim & Data",
  "promise alignment": "Janji Utama Ebook",
  "offer alignment": "Penyelarasan Penawaran",
  "contradictions": "Konsistensi Materi",
  "structure": "Struktur Bab",
  "content": "Kualitas Isi",
  "format": "Format Template",
};

export function formatAiCategory(category: string): string {
  if (!category) return "Umum";
  const normalized = category.toLowerCase().trim();
  return CATEGORY_TRANSLATIONS[normalized] || category;
}

export function formatAiSeverity(severity: string): { label: string; isImportant: boolean } {
  const isImportant = severity === "important" || severity === "blocker";
  return {
    label: isImportant ? "Prioritas Utama" : "Saran Perbaikan",
    isImportant,
  };
}

interface SectionInfo {
  id: string;
  title: string;
  position?: number;
}

interface AiQualityReviewProps {
  projectId: string;
  sections?: SectionInfo[];
  onNavigateSection?: (sectionId: string) => void;
}

export function AiQualityReview({
  projectId,
  sections,
  onNavigateSection,
}: AiQualityReviewProps) {
  const { data: costs } = useCreditCosts();
  const pushToast = useUiStore((s) => s.pushToast);
  const cost = costs?.quality_review ?? CREDIT_COSTS.quality_review;
  const [loading, setLoading] = React.useState(false);
  const [result, setResult] = React.useState<AiQualityReviewResult | null>(null);

  const run = async () => {
    if (loading) return;
    setLoading(true);
    try {
      const res = await apiFetch<AiQualityReviewResult & { cost?: number }>(
        `/api/projects/${projectId}/quality-review`,
        { method: "POST", body: JSON.stringify({}) },
      );
      setResult(res);
      pushToast({ title: "Analisis redaksi AI selesai", variant: "success" });
    } catch (err) {
      const e = err as { code?: string; message?: string };
      pushToast({
        title:
          e?.code === "insufficient_credits"
            ? "Kredit tidak cukup"
            : "Analisis AI gagal",
        description: e?.message,
        variant: "danger",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4 rounded-2xl border border-[var(--color-publiora-border)] bg-white p-4 sm:p-5 shadow-xs">
      {/* Header section with description and run action */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 pb-3 border-b border-gray-100">
        <div className="space-y-1.5 min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-blue-50 text-[var(--color-publiora-blue)] flex items-center justify-center shrink-0">
              <Sparkles className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[var(--color-publiora-black)]">
                Audit Redaksi &amp; Alur Naskah (AI)
              </h3>
              <span className="text-[11px] font-medium text-[var(--color-medium-gray)]">
                Opsional · Cek gaya bahasa, keterbacaan, dan keselarasan ide
              </span>
            </div>
          </div>
          <p className="text-xs text-[var(--color-deep-gray)] leading-relaxed pl-9">
            AI akan membaca draf secara menyeluruh untuk mengevaluasi transisi antar bab,
            kesesuaian dengan audiens, dan menghindari pengulangan ide tanpa mengubah konten otomatis.
          </p>
        </div>

        <Button
          size="sm"
          onClick={() => void run()}
          loading={loading}
          className="w-full sm:w-auto shrink-0 justify-center self-start sm:self-center"
        >
          <Sparkles className="h-3.5 w-3.5 mr-1" />
          {reviewId.aiReview(cost)}
        </Button>
      </div>

      {/* Review results */}
      {result && (
        <div className="space-y-4 pt-1">
          {/* Summary Box */}
          <div className="rounded-xl bg-blue-50/70 border border-blue-200/70 p-3.5 sm:p-4 text-xs sm:text-sm text-blue-950 leading-relaxed space-y-1.5">
            <div className="flex items-center gap-1.5 font-bold text-blue-900 text-xs uppercase tracking-wide">
              <Sparkles className="h-3.5 w-3.5 text-[var(--color-publiora-blue)]" />
              Rangkuman Evaluasi Naskah
            </div>
            <p className="text-xs sm:text-sm text-blue-900/90 leading-relaxed font-normal">
              {result.summary}
            </p>
          </div>

          {/* Issues list or clean state */}
          {result.issues.length === 0 ? (
            <div className="flex items-center gap-2.5 p-3 rounded-xl bg-emerald-50/60 border border-emerald-200/60 text-xs sm:text-sm text-emerald-900 font-medium">
              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
              <span>Naskah sangat baik! AI tidak menemukan kelemahan alur atau pengulangan materi yang signifikan.</span>
            </div>
          ) : (
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-[var(--color-deep-gray)] uppercase tracking-wider">
                  Catatan Redaksi AI ({result.issues.length})
                </h4>
                <span className="text-[11px] text-[var(--color-medium-gray)]">
                  Saran opsional untuk menyempurnakan naskah
                </span>
              </div>

              <ul className="space-y-2.5">
                {result.issues.map((issue, i) => {
                  const sev = formatAiSeverity(issue.severity);
                  const catLabel = formatAiCategory(issue.category);
                  const matchedSection = issue.section_id
                    ? sections?.find((s) => s.id === issue.section_id)
                    : undefined;

                  return (
                    <li
                      key={`${issue.title}-${i}`}
                      className={cn(
                        "rounded-xl border p-3.5 transition-all space-y-2",
                        sev.isImportant
                          ? "bg-rose-50/40 border-rose-200/80 shadow-xs"
                          : "bg-amber-50/30 border-amber-200/70 shadow-xs",
                      )}
                    >
                      <div className="flex items-start gap-2.5">
                        <div
                          className={cn(
                            "w-6 h-6 rounded-lg flex items-center justify-center shrink-0 mt-0.5",
                            sev.isImportant
                              ? "bg-rose-100 text-rose-700"
                              : "bg-amber-100 text-amber-700",
                          )}
                        >
                          <AlertCircle className="h-3.5 w-3.5" />
                        </div>

                        <div className="min-w-0 flex-1 space-y-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span
                              className={cn(
                                "text-[11px] font-bold px-1.5 py-0.5 rounded",
                                sev.isImportant
                                  ? "bg-rose-100 text-rose-800"
                                  : "bg-amber-100 text-amber-800",
                              )}
                            >
                              {sev.label}
                            </span>

                            <span className="text-[11px] font-medium text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded">
                              {catLabel}
                            </span>

                            {matchedSection && (
                              <span className="text-[11px] font-semibold text-[var(--color-publiora-blue)] bg-blue-50/80 px-1.5 py-0.5 rounded truncate max-w-[200px]">
                                {matchedSection.position ? `Bab ${matchedSection.position}: ` : ""}
                                {matchedSection.title}
                              </span>
                            )}
                          </div>

                          <h5 className="text-xs sm:text-sm font-semibold text-[var(--color-publiora-black)] leading-snug">
                            {issue.title}
                          </h5>

                          <p className="text-xs text-[var(--color-deep-gray)] leading-relaxed">
                            {issue.explanation}
                          </p>

                          {issue.suggested_action && (
                            <div className="mt-2 rounded-lg bg-white/90 border border-black/5 p-2 text-xs text-[var(--color-deep-gray)] flex items-start gap-1.5">
                              <Lightbulb className="h-3.5 w-3.5 text-[var(--color-gold)] shrink-0 mt-0.5" />
                              <div>
                                <span className="font-semibold text-[var(--color-publiora-black)]">Saran: </span>
                                {issue.suggested_action}
                              </div>
                            </div>
                          )}

                          {issue.section_id && onNavigateSection && (
                            <div className="pt-1.5">
                              <button
                                type="button"
                                onClick={() => onNavigateSection(issue.section_id!)}
                                className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--color-publiora-blue)] hover:text-blue-800 py-1 px-2.5 rounded-lg bg-white border border-blue-200/80 hover:bg-blue-50/60 shadow-2xs transition-colors active:scale-[0.98]"
                              >
                                <BookOpen className="h-3 w-3" />
                                <span>Buka Bagian Ini</span>
                                <ArrowRight className="h-3 w-3" />
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
