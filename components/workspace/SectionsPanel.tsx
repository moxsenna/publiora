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
import { getUiErrorMessage } from "@/lib/i18n/id/errors";
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
import { Sparkles, FileText, Play, Save } from "lucide-react";
import type { Section } from "@/types/section";
import type { EnhancementAction, EnhancementSuggestion } from "@/types/ai-suggestions";
import { cn } from "@/lib/utils";
import { sectionHasReplaceableContent } from "@/lib/section-revisions";
import { CREDIT_COSTS } from "@/lib/billing/plans";
import { sectionStatusLabelsId } from "@/lib/i18n/id/common";

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

  const [activeId, setActiveId] = React.useState<string | null>(null);
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
  const [acceptedUndo, setAcceptedUndo] = React.useState<{
    sectionId: string;
    priorHtml: string;
    acceptedUpdatedAt: string;
  } | null>(null);
  const [editorRevision, setEditorRevision] = React.useState(0);

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
          description="Buat outline di tahap Tulis sebelum menulis bagian."
        />
      </div>
    );
  }

  const current = activeId
    ? (sections?.find((s) => s.id === activeId) ?? null)
    : (sections?.[0] ?? null);

  const currentOutline =
    outline.sections.find((os) => os.id === current?.outline_section_id) ??
    outline.sections[0];
  const currentLabel =
    current?.title ?? currentOutline?.title ?? "Pilih bagian";

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
          description: "Perubahan bagian aktif belum tersimpan.",
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
      const s = await generate.mutateAsync({
        projectId,
        outlineSectionId,
        confirmReplaceExisting,
      });
      setActiveId(s.id);
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
        title: "Gagal menulis bagian",
        description: getUiErrorMessage(err),
        variant: "danger",
      });
    }
  };

  const onGenerateOne = async (outlineSectionId: string) => {
    if (generate.isPending) return;
    if (flushRef.current) {
      const ok = await flushRef.current();
      if (!ok) {
        pushToast({
          title: "Simpan dulu",
          description: "Perubahan bagian aktif belum tersimpan.",
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
          description: "Perubahan bagian aktif belum tersimpan.",
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
            : getUiErrorMessage(err),
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
      if (section && sectionHasReplaceableContent(section)) {
        const revisionResponse = await fetch(
          `/api/projects/${projectId}/sections/${reviewSectionId}/revisions`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "same-origin",
            body: JSON.stringify({ source: "before_enhancement_accept" }),
          },
        );
        if (!revisionResponse.ok) {
          throw new Error("revision_snapshot_failed");
        }
      }
      const saved = await updateSection.mutateAsync({
        id: reviewSectionId,
        projectId,
        patch: {
          content_html: suggestedHtml,
          expected_updated_at: section?.updated_at,
        },
      });
      if (section) {
        setAcceptedUndo({
          sectionId: reviewSectionId,
          priorHtml: section.content_html,
          acceptedUpdatedAt: saved.updated_at,
        });
      }
      setEditorRevision((value) => value + 1);
      setDirty(false);
      setReviewOpen(false);
      setReviewSuggestion(null);
      pushToast({ title: "Enhancement diterapkan", variant: "success" });
    } catch (err) {
      setReviewError(getUiErrorMessage(err));
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
      setReviewError(getUiErrorMessage(err));
    } finally {
      setRegenerating(false);
    }
  };

  const handleSessionUndo = async () => {
    if (!acceptedUndo || !projectId) return;
    setUndoing(true);
    try {
      await updateSection.mutateAsync({
        id: acceptedUndo.sectionId,
        projectId,
        patch: {
          content_html: acceptedUndo.priorHtml,
          expected_updated_at: acceptedUndo.acceptedUpdatedAt,
        },
      });
      setEditorRevision((value) => value + 1);
      setDirty(false);
      setAcceptedUndo(null);
      pushToast({
        title: "Konten dikembalikan ke versi sebelumnya",
        variant: "success",
      });
    } catch (err) {
      pushToast({
        title: "Konten belum dapat dikembalikan",
        description: getUiErrorMessage(err),
        variant: "danger",
      });
    } finally {
      setUndoing(false);
    }
  };

  const selectSection = async (osId: string, sectionId?: string) => {
    if (flushRef.current) {
      const ok = await flushRef.current();
      if (!ok) {
        pushToast({
          title: "Belum dapat berpindah bagian",
          description: "Gagal menyimpan perubahan. Coba lagi dulu.",
          variant: "danger",
        });
        return;
      }
    }
    if (sectionId) setActiveId(sectionId);
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
    <ul className="p-1.5 space-y-0.5" aria-label="Daftar bagian">
      {outline.sections.map((os) => {
        const section = sectionsByOutline.get(os.id);
        const active = current?.id === section?.id || (!current && os.id === currentOutline?.id);
        return (
          <li key={os.id} className="rounded-lg hover:bg-[var(--color-surface-2)]">
            <div className="flex items-stretch gap-1">
              <button
                type="button"
                aria-current={active ? "true" : undefined}
                onClick={() => void selectSection(os.id, section?.id)}
                className={cn("flex-1 min-h-11 text-left p-2 rounded-lg", active && "bg-[var(--color-surface-2)]")}
              >
                <span className="flex items-center gap-2">
                  <span className="text-xs font-bold text-[var(--color-medium-gray)]">{os.position}</span>
                  <span className="text-sm font-medium text-[var(--color-deep-gray)] line-clamp-1 flex-1">{section?.title ?? os.title}</span>
                  {section ? <Badge variant={section.status === "edited" ? "info" : "success"}>{section.word_count} kata</Badge> : <Badge variant="default">{sectionStatusLabelsId.pending}</Badge>}
                </span>
              </button>
              {!section && (
                <Button size="sm" variant="outline" loading={generate.isPending} disabled={generate.isPending || batchBusy} onClick={() => void onGenerateOne(os.id)} aria-label={`Tulis ${os.title}`}>
                  <Sparkles className="h-3.5 w-3.5" /> Tulis
                </Button>
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );

  return (
    <div className="grid md:grid-cols-[240px_1fr] lg:grid-cols-[260px_1fr] h-full">
      <aside className="hidden md:flex flex-col border-r border-[var(--color-publiora-border)] bg-white overflow-y-auto min-h-0">
        <div className="p-2.5 flex items-center justify-between gap-2 sticky top-0 bg-white z-10 border-b border-[var(--color-publiora-border)]">
          <span className="text-sm font-semibold text-[var(--color-publiora-black)]">
            Bagian
          </span>
          <Button
            size="sm"
            variant="outline"
            onClick={() => void onGenerateAll()}
            loading={batchBusy}
            disabled={batchBusy}
          >
            <Play className="h-3.5 w-3.5" />
            {batchBusy ? "Menulis…" : "Tulis semua"}
          </Button>
        </div>
        {sectionList}
      </aside>

      <div className="overflow-y-auto bg-[var(--color-surface-2)] min-h-0 flex flex-col">
        <div className="md:hidden sticky top-0 z-20 border-b border-[var(--color-publiora-border)] bg-white">
          <div className="p-2.5 flex items-center gap-2">
            <select
              aria-label="Pilih bagian"
              value={currentOutline?.id ?? ""}
              onChange={(event) => {
                const outlineId = event.target.value;
                const section = sectionsByOutline.get(outlineId);
                void selectSection(outlineId, section?.id);
              }}
              className="flex-1 min-h-11 rounded-lg border border-[var(--color-publiora-border)] bg-white px-3 text-sm"
            >
              {outline.sections.map((os) => (
                <option key={os.id} value={os.id}>{os.position}. {sectionsByOutline.get(os.id)?.title ?? os.title}</option>
              ))}
            </select>
            <Button size="sm" variant="outline" onClick={() => void onGenerateAll()} loading={batchBusy} disabled={batchBusy} aria-label="Tulis semua bagian">
              <Play className="h-3.5 w-3.5" />
            </Button>
          </div>
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

        {!current ? (
          <div className="p-6">
            <EmptyState
              icon={<FileText className="h-6 w-6" />}
              title="Belum ada bagian yang ditulis"
              description="Pilih bagian, lalu tulis untuk mulai menyunting."
            />
          </div>
        ) : (
          <SectionEditor
            key={`${current.id}:${editorRevision}`}
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
        )}
      </div>

      {acceptedUndo && (
        <div role="status" className="fixed bottom-4 left-1/2 z-40 flex -translate-x-1/2 items-center gap-3 rounded-lg border border-[var(--color-publiora-border)] bg-white px-4 py-3 shadow-lg">
          <span className="text-sm">Saran telah diterapkan.</span>
          <Button variant="outline" size="sm" onClick={() => void handleSessionUndo()} loading={undoing}>
            Urungkan penerapan
          </Button>
        </div>
      )}

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
          if (insufficient) return;
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
          aria-label="Judul bagian"
          value={draft.title}
          onChange={(e) => draft.setTitle(e.target.value)}
          className="text-sm font-semibold min-w-[10rem] flex-1"
        />
        <span
          className="text-[11px] text-[var(--color-medium-gray)] min-w-[6rem]"
          role="status"
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
          Tulis ulang
        </Button>
        <Button
          size="sm"
          disabled={!draft.isDirty || draft.saveState === "saving"}
          loading={draft.saveState === "saving"}
          onClick={() => void draft.flushSave()}
        >
          <Save className="h-4 w-4" />
          {draft.saveState === "error" ? "Coba lagi" : "Simpan"}
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
