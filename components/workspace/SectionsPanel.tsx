"use client";

import * as React from "react";
import {
  useOutline,
  useSections,
  useGenerateSection,
  useUpdateSection,
  useEnhanceSection,
  useCreditBalance,
  useCreditCosts,
} from "@/lib/api/hooks";
import { useUiStore } from "@/store/projectStore";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { RichTextEditor } from "@/components/editor/RichTextEditor";
import { EnhancementMenu } from "@/components/workspace/EnhancementMenu";
import { EnhancementReviewDialog } from "@/components/workspace/EnhancementReviewDialog";
import {
  saveStateLabel,
  useSectionDraft,
  type SaveState,
} from "@/components/workspace/useSectionDraft";
import { SectionRevisionDialog } from "@/components/workspace/SectionRevisionDialog";
import {
  GenerationConfirmDialog,
  GenerationProgressPanel,
} from "@/components/workspace/GenerationProgressPanel";
import {
  estimateGenerationCost,
  useSequentialSectionGeneration,
} from "@/components/workspace/useSequentialSectionGeneration";
import {
  Sparkles,
  FileText,
  Play,
  Save,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Check,
  Loader2,
  X,
} from "lucide-react";
import type { Section } from "@/types/section";
import type { EnhancementAction, EnhancementSuggestion } from "@/types/ai-suggestions";
import { cn } from "@/lib/utils";
import { sectionHasReplaceableContent } from "@/lib/section-revisions";
import { CREDIT_COSTS } from "@/lib/billing/plans";
import { sectionStatusLabelsId } from "@/lib/i18n/id/common";
import { workspaceId } from "@/lib/i18n/id/workspace";
import { AiLoadingAnimation } from "@/components/ui/AiLoadingAnimation";

export function SectionsPanel({ projectId }: { projectId: string }) {
  const { data: outline } = useOutline(projectId);
  const { data: sections, isLoading } = useSections(projectId);
  const generate = useGenerateSection();
  const updateSection = useUpdateSection();
  const enhance = useEnhanceSection();
  const { data: creditBalance } = useCreditBalance();
  const { data: creditCosts } = useCreditCosts();
  const pushToast = useUiStore((s) => s.pushToast);

  const sequential = useSequentialSectionGeneration({
    generateOne: async ({ outlineSectionId, confirmReplaceExisting }) => {
      return generate.mutateAsync({
        projectId,
        outlineSectionId,
        confirmReplaceExisting,
      });
    },
  });

  const [selectedOutlineId, setSelectedOutlineId] = React.useState<string | null>(null);
  const [pickerOpen, setPickerOpen] = React.useState(false);

  // Enhancement review dialog state
  const [reviewOpen, setReviewOpen] = React.useState(false);
  const [reviewSuggestion, setReviewSuggestion] =
    React.useState<EnhancementSuggestion | null>(null);
  const [reviewSectionId, setReviewSectionId] = React.useState<string | null>(
    null,
  );
  const [reviewAction, setReviewAction] =
    React.useState<EnhancementAction | null>(null);
  const [priorHtml, setPriorHtml] = React.useState<string | null>(null);
  const [reviewError, setReviewError] = React.useState<string | null>(null);
  const [accepting, setAccepting] = React.useState(false);
  const [rejecting, setRejecting] = React.useState(false);
  const [regenerating, setRegenerating] = React.useState(false);
  const [undoing, setUndoing] = React.useState(false);

  const [dirty, setDirty] = React.useState(false);
  const flushRef = React.useRef<(() => Promise<boolean>) | null>(null);
  const [replaceDialogOpen, setReplaceDialogOpen] = React.useState(false);
  const [pendingReplaceOutlineId, setPendingReplaceOutlineId] = React.useState<
    string | null
  >(null);

  React.useEffect(() => {
    if (!dirty) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirty]);

  const sectionsByOutline = React.useMemo(() => {
    const map = new Map<string, Section>();
    for (const s of sections ?? []) map.set(s.outline_section_id, s);
    return map;
  }, [sections]);

  React.useEffect(() => {
    if (sequential.phase !== "running") return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [sequential.phase]);

  const sectionCost = creditCosts?.section ?? CREDIT_COSTS.section;
  const balanceAmount =
    typeof creditBalance?.balance === "number" ? creditBalance.balance : null;

  if (isLoading) {
    return (
      <div className="p-4 grid md:grid-cols-3 gap-4">
        <Skeleton className="h-64" />
        <Skeleton className="h-64 md:col-span-2" />
      </div>
    );
  }

  if (!outline) {
    return (
      <div className="p-6">
        <EmptyState
          icon={<FileText className="h-6 w-6" />}
          title="Outline belum ada"
          description="Buat outline di tab Write dulu sebelum generate sections."
        />
      </div>
    );
  }

  const currentOutline =
    (selectedOutlineId
      ? outline.sections.find((os) => os.id === selectedOutlineId)
      : null) ??
    (sections && sections.length > 0
      ? outline.sections.find((os) => os.id === sections[0].outline_section_id)
      : null) ??
    outline.sections[0] ??
    null;

  const current = currentOutline
    ? sectionsByOutline.get(currentOutline.id) ?? null
    : null;
  const currentLabel =
    current?.title ?? currentOutline?.title ?? "Pilih section";

  const currentIndex = outline.sections.findIndex(
    (os) => os.id === currentOutline?.id,
  );
  const prevOutline =
    currentIndex > 0 ? outline.sections[currentIndex - 1] : null;
  const nextOutline =
    currentIndex >= 0 && currentIndex < outline.sections.length - 1
      ? outline.sections[currentIndex + 1]
      : null;
  const unwrittenCount = Math.max(
    0,
    outline.sections.length - (sections?.length ?? 0),
  );

  const onGenerateAll = async () => {
    if (
      sequential.phase === "running" ||
      sequential.phase === "paused_on_failure"
    ) {
      return;
    }
    if (flushRef.current) {
      const ok = await flushRef.current();
      if (!ok) {
        pushToast({
          title: "Simpan dulu",
          description: "Perubahan section aktif belum tersimpan.",
          variant: "danger",
        });
        return;
      }
    }
    sequential.prepare({
      outlineSections: outline.sections,
      sectionsByOutlineId: sectionsByOutline,
      includeCompleted: false,
    });
  };

  const runGenerateOne = async (
    outlineSectionId: string,
    confirmReplaceExisting?: boolean,
  ) => {
    try {
      setSelectedOutlineId(outlineSectionId);
      const s = await generate.mutateAsync({
        projectId,
        outlineSectionId,
        confirmReplaceExisting,
      });
      setSelectedOutlineId(s.outline_section_id);
      setReplaceDialogOpen(false);
      setPendingReplaceOutlineId(null);
    } catch (err) {
      const e = err as { code?: string; message?: string };
      if (e?.code === "section_replace_confirmation_required") {
        setPendingReplaceOutlineId(outlineSectionId);
        setReplaceDialogOpen(true);
        return;
      }
      pushToast({
        title: "Generate gagal",
        description: e?.message ?? "Coba generate ulang.",
        variant: "danger",
      });
    }
  };

  const onGenerateOne = async (outlineSectionId: string) => {
    if (generate.isPending) return;
    setSelectedOutlineId(outlineSectionId);
    if (flushRef.current) {
      const ok = await flushRef.current();
      if (!ok) {
        pushToast({
          title: "Simpan dulu",
          description: "Perubahan section aktif belum tersimpan.",
          variant: "danger",
        });
        return;
      }
    }

    const existing = sectionsByOutline.get(outlineSectionId);
    if (sectionHasReplaceableContent(existing)) {
      setPendingReplaceOutlineId(outlineSectionId);
      setReplaceDialogOpen(true);
      return;
    }

    await runGenerateOne(outlineSectionId, false);
  };

  const onEnhance = async (
    sectionId: string,
    action: EnhancementAction,
  ) => {
    if (enhance.isPending) return;
    if (flushRef.current) {
      const ok = await flushRef.current();
      if (!ok) {
        pushToast({
          title: "Simpan dulu",
          description: "Perubahan section aktif belum tersimpan.",
          variant: "danger",
        });
        return;
      }
    }
    try {
      setReviewError(null);
      setReviewSectionId(sectionId);
      setReviewAction(action);
      const section = sections?.find((s) => s.id === sectionId);
      setPriorHtml(section?.content_html ?? null);

      const result = await enhance.mutateAsync({
        projectId,
        sectionId,
        action,
      });

      setReviewSuggestion(result.suggestion);
      setReviewOpen(true);
    } catch (err) {
      const e = err as { code?: string; message?: string };
      pushToast({
        title:
          e?.code === "insufficient_credits"
            ? "Kredit tidak cukup"
            : "Enhance gagal",
        description:
          e?.code === "insufficient_credits"
            ? "Buka Billing untuk top-up."
            : (e?.message ?? "Coba lagi."),
        variant: "danger",
      });
    }
  };

  const handleAccept = async (suggestedHtml: string) => {
    if (!reviewSectionId || !projectId) return;
    setAccepting(true);
    setReviewError(null);
    try {
      const section = sections?.find((s) => s.id === reviewSectionId);
      // Best-effort revision snapshot before enhancement overwrite (no AI credit).
      if (section && sectionHasReplaceableContent(section)) {
        await fetch(
          `/api/projects/${projectId}/sections/${reviewSectionId}/revisions`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "same-origin",
            body: JSON.stringify({ source: "before_enhancement_accept" }),
          },
        ).catch(() => null);
      }
      await updateSection.mutateAsync({
        id: reviewSectionId,
        projectId,
        patch: {
          content_html: suggestedHtml,
          expected_updated_at: section?.updated_at,
        },
      });
      setDirty(false);
      setReviewOpen(false);
      setReviewSuggestion(null);
      pushToast({ title: "Enhancement diterapkan", variant: "success" });
    } catch (err) {
      const e = err as { message?: string };
      setReviewError(
        e?.message ??
          "Gagal menyimpan enhancement. Dialog tetap terbuka — silakan coba lagi.",
      );
    } finally {
      setAccepting(false);
    }
  };

  const handleReject = () => {
    setRejecting(true);
    setReviewOpen(false);
    setReviewSuggestion(null);
    setReviewError(null);
    setRejecting(false);
  };

  const handleRegenerate = async () => {
    if (!reviewSectionId || !reviewAction || !projectId) return;
    setRegenerating(true);
    setReviewError(null);
    try {
      const result = await enhance.mutateAsync({
        projectId,
        sectionId: reviewSectionId,
        action: reviewAction,
      });
      setReviewSuggestion(result.suggestion);
    } catch (err) {
      const e = err as { message?: string };
      setReviewError(e?.message ?? "Regenerate gagal. Silakan coba lagi.");
    } finally {
      setRegenerating(false);
    }
  };

  const handleSessionUndo = async () => {
    if (!reviewSectionId || !priorHtml || !projectId) return;
    setUndoing(true);
    setReviewError(null);
    try {
      const section = sections?.find((s) => s.id === reviewSectionId);
      await updateSection.mutateAsync({
        id: reviewSectionId,
        projectId,
        patch: {
          content_html: priorHtml,
          expected_updated_at: section?.updated_at,
        },
      });
      setDirty(false);
      setReviewOpen(false);
      setReviewSuggestion(null);
      setPriorHtml(null);
      pushToast({
        title: "Konten dikembalikan ke versi sebelumnya",
        variant: "success",
      });
    } catch (err) {
      const e = err as { message?: string };
      setReviewError(
        e?.message ??
          "Gagal mengembalikan konten. Dialog tetap terbuka — silakan coba lagi.",
      );
    } finally {
      setUndoing(false);
    }
  };

  const selectSection = async (osId: string) => {
    if (flushRef.current) {
      const ok = await flushRef.current();
      if (!ok) {
        pushToast({
          title: "Belum bisa pindah section",
          description: "Gagal menyimpan perubahan. Coba lagi dulu.",
          variant: "danger",
        });
        return;
      }
    }
    setSelectedOutlineId(osId);
    setPickerOpen(false);
  };

  const batchBusy =
    sequential.phase === "running" || sequential.phase === "paused_on_failure";
  const queueCost = estimateGenerationCost(
    sequential.queue.length,
    sectionCost,
  );
  const insufficient =
    balanceAmount != null && queueCost > balanceAmount && sequential.queue.length > 0;

  const sectionList = (
    <div className="p-2 space-y-1.5">
      {outline.sections.map((os) => {
        const s = sectionsByOutline.get(os.id);
        const active = os.id === currentOutline?.id;
        const isGeneratingThis =
          generate.isPending && currentOutline?.id === os.id;

        return (
          <button
            key={os.id}
            type="button"
            onClick={() => void selectSection(os.id)}
            className={cn(
              "w-full text-left p-2.5 rounded-xl transition-all flex items-center gap-3 border",
              active
                ? "bg-blue-50/70 border-[var(--color-publiora-blue)] text-[var(--color-publiora-black)] shadow-xs ring-1 ring-[var(--color-publiora-blue)]/20"
                : "bg-white border-[var(--color-publiora-border)] hover:bg-[var(--color-surface-2)] text-[var(--color-deep-gray)]",
            )}
          >
            <span
              className={cn(
                "w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 transition-colors",
                active
                  ? "bg-[var(--color-publiora-blue)] text-white"
                  : s
                  ? "bg-emerald-100 text-emerald-700"
                  : "bg-gray-100 text-gray-500",
              )}
            >
              {s ? <Check className="h-3.5 w-3.5 stroke-[2.5]" /> : os.position}
            </span>

            <div className="flex-1 min-w-0">
              <p className="text-xs sm:text-sm font-semibold truncate leading-tight">
                {os.title}
              </p>
              <p className="text-[11px] text-[var(--color-medium-gray)] truncate mt-0.5">
                {s
                  ? `${s.word_count} kata • ${sectionStatusLabelsId[s.status] ?? s.status}`
                  : `Target ~${os.estimated_words ?? 700} kata`}
              </p>
            </div>

            <div className="shrink-0">
              {isGeneratingThis ? (
                <span className="flex items-center gap-1 text-xs font-medium text-[var(--color-publiora-blue)]">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  <span className="hidden sm:inline">Menulis</span>
                </span>
              ) : s ? (
                <Badge
                  variant={s.status === "edited" ? "info" : "success"}
                  className="text-[11px] px-1.5 py-0.5"
                >
                  {s.word_count}w
                </Badge>
              ) : (
                <span className="text-[11px] font-medium text-[var(--color-medium-gray)] bg-gray-100 px-2 py-0.5 rounded-md">
                  Draft
                </span>
              )}
            </div>
          </button>
        );
      })}
    </div>
  );

  return (
    <div className="grid md:grid-cols-[250px_1fr] lg:grid-cols-[280px_1fr] h-full">
      <aside className="hidden md:flex flex-col border-r border-[var(--color-publiora-border)] bg-white overflow-y-auto min-h-0">
        <div className="p-3 flex items-center justify-between gap-2 sticky top-0 bg-white z-10 border-b border-[var(--color-publiora-border)]">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-[var(--color-publiora-black)]">
              Sections
            </span>
            <p className="text-[11px] text-[var(--color-medium-gray)] mt-0.5">
              {sections?.length ?? 0} dari {outline.sections.length} ditulis
            </p>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => void onGenerateAll()}
            loading={batchBusy}
            disabled={batchBusy}
            title={workspaceId.writeAllSections}
          >
            <Play className="h-3.5 w-3.5 mr-1" />
            {batchBusy ? "Menulis…" : "Tulis semua"}
          </Button>
        </div>
        <div className="flex-1 overflow-y-auto">
          {sectionList}
        </div>
      </aside>

      <div className="overflow-y-auto bg-[var(--color-surface-2)] min-h-0 flex flex-col">
        <div className="md:hidden sticky top-0 z-20 border-b border-[var(--color-publiora-border)] bg-white shadow-xs">
          <div className="p-2.5 flex items-center gap-2">
            <button
              type="button"
              onClick={() => setPickerOpen((v) => !v)}
              className="flex-1 min-w-0 flex items-center justify-between gap-2 rounded-xl border border-[var(--color-publiora-border)] bg-[var(--color-surface-2)] px-3 py-2 text-left active:scale-[0.99] transition-transform"
              aria-expanded={pickerOpen}
              aria-haspopup="listbox"
              aria-label="Pilih section"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] font-bold text-[var(--color-publiora-blue)] bg-blue-100/60 px-1.5 py-0.5 rounded">
                    #{currentOutline?.position ?? 1}
                  </span>
                  <span className="text-[11px] text-[var(--color-medium-gray)]">
                    {current ? `${current.word_count}w` : "Belum ditulis"}
                  </span>
                </div>
                <span className="block text-xs sm:text-sm font-semibold text-[var(--color-publiora-black)] truncate mt-0.5">
                  {currentOutline?.title ?? "Pilih section"}
                </span>
              </div>
              <ChevronDown
                className={cn(
                  "h-4 w-4 shrink-0 text-[var(--color-medium-gray)] transition-transform duration-200",
                  pickerOpen && "rotate-180 text-[var(--color-publiora-blue)]",
                )}
              />
            </button>
            <Button
              size="sm"
              onClick={() => {
                if (currentOutline) {
                  void onGenerateOne(currentOutline.id);
                } else {
                  void onGenerateAll();
                }
              }}
              loading={generate.isPending}
              disabled={generate.isPending || batchBusy}
              aria-label={current ? workspaceId.regenerate : workspaceId.generate}
              className="shrink-0 font-medium px-3"
            >
              {!generate.isPending && <Sparkles className="h-3.5 w-3.5 mr-1" />}
              <span>
                {generate.isPending
                  ? "Menulis…"
                  : current
                  ? "Tulis ulang"
                  : "Tulis"}
              </span>
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => void onGenerateAll()}
              loading={batchBusy}
              disabled={batchBusy}
              aria-label={workspaceId.writeAllSections}
              className="shrink-0 px-2.5"
              title={workspaceId.writeAllSections}
            >
              <Play className="h-3.5 w-3.5" />
              <span className="text-xs ml-1">Semua</span>
            </Button>
          </div>
          {pickerOpen && (
            <div
              role="listbox"
              className="max-h-[60vh] overflow-y-auto border-t border-[var(--color-publiora-border)] bg-gray-50/50 overscroll-contain animate-fade-in"
            >
              <div className="p-2.5 bg-white border-b border-[var(--color-publiora-border)] flex items-center justify-between">
                <span className="text-xs font-semibold text-[var(--color-publiora-black)]">
                  Daftar Section ({sections?.length ?? 0}/{outline.sections.length} ditulis)
                </span>
                <button
                  type="button"
                  onClick={() => setPickerOpen(false)}
                  className="text-xs text-[var(--color-medium-gray)] hover:text-gray-900 p-1 flex items-center gap-1"
                >
                  <X className="h-3.5 w-3.5" />
                  <span>Tutup</span>
                </button>
              </div>
              {sectionList}
            </div>
          )}
        </div>

        {(sequential.phase === "running" ||
          sequential.phase === "paused_on_failure" ||
          sequential.phase === "completed" ||
          sequential.phase === "stopped") && (
          <div className="p-3 border-b border-[var(--color-publiora-border)] bg-white">
            <GenerationProgressPanel
              phase={sequential.phase}
              queue={sequential.queue}
              currentIndex={sequential.currentIndex}
              stopAfterCurrent={sequential.stopAfterCurrent}
              onStopAfterCurrent={sequential.requestStopAfterCurrent}
              onRetry={() => void sequential.retryCurrent()}
              onSkip={() => void sequential.skipAndContinue()}
              onStop={() => sequential.reset()}
              onClose={() => sequential.reset()}
            />
          </div>
        )}

        {!current && currentOutline ? (
          <div className="p-4 sm:p-8 flex-1 flex flex-col items-center justify-center max-w-2xl mx-auto w-full">
            {generate.isPending ? (
              <AiLoadingAnimation
                variant="writing"
                title="AI Sedang Menulis Section"
                subtitle={`Menyusun section "${currentOutline.title}"...`}
                className="w-full max-w-md animate-fade-in"
              />
            ) : (
              <div className="w-full bg-white rounded-2xl border border-[var(--color-publiora-border)] p-5 sm:p-7 shadow-xs space-y-5 animate-fade-in">
                <div className="flex items-center justify-between gap-2 border-b border-[var(--color-publiora-border)] pb-3.5">
                  <span className="text-xs font-bold text-[var(--color-publiora-blue)] bg-blue-50 px-2.5 py-1 rounded-full">
                    Section {currentOutline.position} dari {outline.sections.length}
                  </span>
                  <Badge variant="default" className="text-xs">
                    Belum ditulis
                  </Badge>
                </div>

                <div className="space-y-2.5">
                  <h2 className="text-lg sm:text-xl font-bold text-[var(--color-publiora-black)] leading-snug">
                    {currentOutline.title}
                  </h2>
                  <p className="text-sm text-[var(--color-deep-gray)] leading-relaxed bg-[var(--color-surface-2)] p-3.5 rounded-xl border border-[var(--color-publiora-border)]">
                    {currentOutline.summary || "Section ini siap ditulis berdasarkan konteks brief dan outline ebook."}
                  </p>
                </div>

                {Array.isArray(currentOutline.key_points) && currentOutline.key_points.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-[var(--color-publiora-black)]">
                      Poin Utama yang Akan Dibahas:
                    </p>
                    <ul className="grid gap-1.5 text-xs text-[var(--color-deep-gray)]">
                      {currentOutline.key_points.map((kp, idx) => (
                        <li key={idx} className="flex items-start gap-2">
                          <Check className="h-3.5 w-3.5 text-emerald-600 shrink-0 mt-0.5" />
                          <span>{kp}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-2.5 pt-1 text-xs text-[var(--color-medium-gray)]">
                  <div className="flex items-center gap-2 p-2.5 rounded-lg bg-gray-50 border border-[var(--color-publiora-border)]">
                    <FileText className="h-4 w-4 text-[var(--color-publiora-blue)]" />
                    <span>Target: <strong className="text-gray-800">~{currentOutline.estimated_words ?? 700} kata</strong></span>
                  </div>
                  <div className="flex items-center gap-2 p-2.5 rounded-lg bg-gray-50 border border-[var(--color-publiora-border)]">
                    <Sparkles className="h-4 w-4 text-[var(--color-publiora-blue)]" />
                    <span>Biaya: <strong className="text-gray-800">1 Kredit AI</strong></span>
                  </div>
                </div>

                <div className="space-y-2.5 pt-2">
                  <Button
                    size="md"
                    className="w-full justify-center text-sm font-semibold shadow-xs"
                    onClick={() => void onGenerateOne(currentOutline.id)}
                    loading={generate.isPending}
                    disabled={generate.isPending || batchBusy}
                  >
                    <Sparkles className="h-4 w-4 mr-1.5" />
                    Tulis Section Ini Sekarang
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full justify-center text-xs"
                    onClick={() => void onGenerateAll()}
                    loading={batchBusy}
                    disabled={batchBusy}
                  >
                    <Play className="h-3.5 w-3.5 mr-1.5" />
                    Tulis Semua Section yang Tersisa ({unwrittenCount} section)
                  </Button>
                </div>
              </div>
            )}
          </div>
        ) : current ? (
          <div className="flex-1 flex flex-col min-h-0">
            <SectionEditor
              key={current.id}
              section={current}
              projectId={projectId}
              onRegenerate={() => void onGenerateOne(current.outline_section_id)}
              onEnhance={(action) => void onEnhance(current.id, action)}
              generating={generate.isPending || batchBusy}
              enhancing={enhance.isPending}
              onDirtyChange={setDirty}
              registerFlush={(fn) => {
                flushRef.current = fn;
              }}
            />

            <div className="max-w-3xl w-full mx-auto p-3 flex items-center justify-between gap-3 border-t border-[var(--color-publiora-border)] mt-auto bg-white/70">
              {prevOutline ? (
                <button
                  type="button"
                  onClick={() => void selectSection(prevOutline.id)}
                  className="flex items-center gap-1.5 text-xs text-[var(--color-deep-gray)] hover:text-gray-900 font-medium px-2.5 py-1.5 rounded-lg border border-[var(--color-publiora-border)] hover:bg-gray-50 transition-colors"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                  <span className="truncate max-w-[120px] sm:max-w-[200px]">
                    {prevOutline.title}
                  </span>
                </button>
              ) : (
                <div />
              )}

              {nextOutline && (
                <button
                  type="button"
                  onClick={() => void selectSection(nextOutline.id)}
                  className="flex items-center gap-1.5 text-xs text-[var(--color-publiora-blue)] hover:text-blue-700 font-semibold px-2.5 py-1.5 rounded-lg border border-[var(--color-publiora-border)] hover:bg-blue-50/50 transition-colors ml-auto"
                >
                  <span className="truncate max-w-[120px] sm:max-w-[200px]">
                    {nextOutline.title}
                  </span>
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>
        ) : null}
      </div>

      <EnhancementReviewDialog
        open={reviewOpen}
        onClose={() => {
          setReviewOpen(false);
          setReviewSuggestion(null);
          setReviewError(null);
        }}
        suggestion={reviewSuggestion}
        priorHtml={priorHtml}
        accepting={accepting}
        rejecting={rejecting}
        regenerating={regenerating}
        undoing={undoing}
        onAccept={handleAccept}
        onReject={handleReject}
        onRegenerate={handleRegenerate}
        onSessionUndo={handleSessionUndo}
        error={reviewError}
      />

      <SectionRevisionDialog
        open={replaceDialogOpen}
        loading={generate.isPending}
        onCancel={() => {
          setReplaceDialogOpen(false);
          setPendingReplaceOutlineId(null);
        }}
        onConfirm={() => {
          if (!pendingReplaceOutlineId) return;
          void runGenerateOne(pendingReplaceOutlineId, true);
        }}
      />

      <GenerationConfirmDialog
        open={sequential.phase === "confirm"}
        queueCount={sequential.queue.length}
        sectionCost={sectionCost}
        balance={balanceAmount}
        insufficient={insufficient}
        onCancel={() => sequential.reset()}
        onStart={() => {
          void sequential.start();
        }}
      />
    </div>
  );
}

function SectionEditor({
  section,
  projectId,
  onRegenerate,
  onEnhance,
  generating,
  enhancing,
  onDirtyChange,
  registerFlush,
}: {
  section: Section;
  projectId: string;
  onRegenerate: () => void;
  onEnhance: (action: EnhancementAction) => void;
  generating?: boolean;
  enhancing?: boolean;
  onDirtyChange?: (dirty: boolean) => void;
  registerFlush?: (fn: (() => Promise<boolean>) | null) => void;
}) {
  const updateSection = useUpdateSection();
  const pushToast = useUiStore((s) => s.pushToast);

  const save = React.useCallback(
    async (input: {
      title: string;
      content_html: string;
      expected_updated_at: string;
    }) => {
      try {
        const saved = await updateSection.mutateAsync({
          id: section.id,
          projectId,
          patch: {
            title: input.title,
            content_html: input.content_html,
            expected_updated_at: input.expected_updated_at,
          },
        });
        return {
          title: saved.title,
          content_html: saved.content_html,
          updated_at: saved.updated_at,
        };
      } catch (err) {
        const e = err as { code?: string; status?: number; message?: string };
        const error = new Error(e?.message ?? "Save failed") as Error & {
          code?: string;
          status?: number;
        };
        error.code = e?.code;
        error.status = e?.status;
        throw error;
      }
    },
    [projectId, section.id, updateSection],
  );

  const draft = useSectionDraft({
    section,
    debounceMs: 1200,
    save,
    onSaveStateChange: (state: SaveState) => {
      onDirtyChange?.(
        state === "dirty" ||
          state === "saving" ||
          state === "error" ||
          state === "conflict",
      );
    },
  });

  React.useEffect(() => {
    registerFlush?.(() => draft.flushSave());
    return () => registerFlush?.(null);
  }, [draft.flushSave, registerFlush]);

  React.useEffect(() => {
    if (draft.saveState === "conflict") {
      pushToast({
        title: "Konflik perubahan",
        description:
          "Konten ini berubah di tempat lain. Muat ulang atau coba simpan lagi.",
        variant: "danger",
      });
    }
  }, [draft.saveState, pushToast]);

  const wordCount = React.useMemo(() => {
    if (!draft.contentHtml) return 0;
    const text = draft.contentHtml.replace(/<[^>]*>/g, " ");
    const words = text
      .replace(/&[a-z]+;/gi, " ")
      .split(/\s+/)
      .filter(Boolean);
    return words.length;
  }, [draft.contentHtml]);

  const hasContent =
    (draft.contentHtml ?? "").replace(/<[^>]*>/g, "").trim().length > 0;
  const statusText = saveStateLabel(draft.saveState, draft.lastSavedAt);

  return (
    <div className="p-3 space-y-3 max-w-3xl mx-auto">
      <div className="flex items-center gap-1.5 flex-wrap">
        <Input
          value={draft.title}
          onChange={(e) => draft.setTitle(e.target.value)}
          className="text-sm font-semibold min-w-[10rem] flex-1"
        />
        <span
          className="text-[11px] text-[var(--color-medium-gray)] min-w-[6rem]"
          aria-live="polite"
        >
          {statusText || `${wordCount} kata`}
        </span>
        <span className="text-[11px] text-[var(--color-medium-gray)] min-w-[3rem] text-right">
          {wordCount}w
        </span>
        <EnhancementMenu
          onAction={onEnhance}
          loading={enhancing}
          disabled={!hasContent}
        />
        <Button
          variant="outline"
          size="sm"
          loading={generating}
          onClick={onRegenerate}
        >
          <Sparkles className="h-4 w-4" />
          {workspaceId.regenerate}
        </Button>
        <Button
          size="sm"
          disabled={!draft.isDirty || draft.saveState === "saving"}
          loading={draft.saveState === "saving"}
          onClick={() => void draft.flushSave()}
        >
          <Save className="h-4 w-4" />
          {draft.saveState === "error" ? "Coba lagi" : workspaceId.save}
        </Button>
      </div>
      {draft.saveState === "error" && (
        <p className="text-xs text-[var(--color-danger,#b91c1c)]">
          Gagal menyimpan.{" "}
          <button
            type="button"
            className="underline font-medium"
            onClick={() => void draft.retrySave()}
          >
            Coba lagi
          </button>
        </p>
      )}
      {draft.saveState === "conflict" && (
        <p className="text-xs text-[var(--color-danger,#b91c1c)]">
          Konten ini berubah di tempat lain. Muat ulang halaman atau gunakan
          versi terbaru, lalu simpan ulang.
        </p>
      )}
      <RichTextEditor
        value={draft.contentHtml}
        onChange={(v) => draft.setContentHtml(v)}
      />
    </div>
  );
}
