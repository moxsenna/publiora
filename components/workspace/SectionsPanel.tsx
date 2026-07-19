"use client";

import * as React from "react";
import {
  useOutline,
  useSections,
  useGenerateSection,
  useGenerateAllSections,
  useUpdateSection,
  useEnhanceSection,
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
import { Sparkles, FileText, Play, Save, ChevronDown } from "lucide-react";
import type { Section } from "@/types/section";
import type { EnhancementAction, EnhancementSuggestion } from "@/types/ai-suggestions";
import { cn } from "@/lib/utils";

export function SectionsPanel({ projectId }: { projectId: string }) {
  const { data: outline } = useOutline(projectId);
  const { data: sections, isLoading } = useSections(projectId);
  const generate = useGenerateSection();
  const generateAll = useGenerateAllSections();
  const updateSection = useUpdateSection();
  const enhance = useEnhanceSection();
  const pushToast = useUiStore((s) => s.pushToast);

  const [activeId, setActiveId] = React.useState<string | null>(null);
  const [pickerOpen, setPickerOpen] = React.useState(false);

  // Enhancement review dialog state
  const [reviewOpen, setReviewOpen] = React.useState(false);
  const [reviewSuggestion, setReviewSuggestion] = React.useState<EnhancementSuggestion | null>(null);
  const [reviewSectionId, setReviewSectionId] = React.useState<string | null>(null);
  const [reviewAction, setReviewAction] = React.useState<EnhancementAction | null>(null);
  const [priorHtml, setPriorHtml] = React.useState<string | null>(null);
  const [reviewError, setReviewError] = React.useState<string | null>(null);
  const [accepting, setAccepting] = React.useState(false);
  const [rejecting, setRejecting] = React.useState(false);
  const [regenerating, setRegenerating] = React.useState(false);
  const [undoing, setUndoing] = React.useState(false);

  // Dirty tracking for beforeunload
  const [dirty, setDirty] = React.useState(false);

  // beforeunload protection
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

  const current = activeId
    ? sections?.find((s) => s.id === activeId) ?? null
    : sections?.[0] ?? null;

  const currentOutline =
    outline.sections.find((os) => os.id === current?.outline_section_id) ??
    outline.sections[0];
  const currentLabel = current?.title ?? currentOutline?.title ?? "Pilih section";

  const onGenerateAll = async () => {
    if (generateAll.isPending) return; // prevent duplicate jobs
    try {
      await generateAll.mutateAsync(projectId);
      pushToast({ title: "Semua section ter-generate", variant: "success" });
    } catch (err) {
      const e = err as { code?: string; message?: string };
      pushToast({
        title: e?.code === "insufficient_credits" ? "Kredit tidak cukup" : "Generate gagal",
        description: e?.code === "insufficient_credits"
          ? "Buka Billing untuk top-up."
          : e?.message ?? "Coba lagi atau hubungi support.",
        variant: "danger",
      });
    }
  };

  const onGenerateOne = async (outlineSectionId: string) => {
    try {
      const s = await generate.mutateAsync({ projectId, outlineSectionId });
      setActiveId(s.id);
    } catch (err) {
      const e = err as { code?: string; message?: string };
      pushToast({
        title: "Generate gagal",
        description: e?.message ?? "Coba generate ulang.",
        variant: "danger",
      });
    }
  };

  const onSave = async (sectionId: string, html: string, title: string) => {
    try {
      await updateSection.mutateAsync({
        id: sectionId,
        projectId,
        patch: { content_html: html, title },
      });
      setDirty(false);
      pushToast({ title: "Section disimpan", variant: "success" });
    } catch {
      pushToast({ title: "Simpan gagal", variant: "danger" });
    }
  };

  // Enhancement flow
  const onEnhance = async (sectionId: string, action: EnhancementAction, currentHtml: string) => {
    try {
      setReviewError(null);
      setReviewSectionId(sectionId);
      setReviewAction(action);
      // Capture prior HTML before suggestion arrives (the persisted version)
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
            : e?.message ?? "Coba lagi.",
        variant: "danger",
      });
    }
  };

  const handleAccept = async (suggestedHtml: string) => {
    if (!reviewSectionId || !projectId) return;
    setAccepting(true);
    setReviewError(null);
    try {
      await updateSection.mutateAsync({
        id: reviewSectionId,
        projectId,
        patch: { content_html: suggestedHtml },
      });
      setDirty(false);
      setReviewOpen(false);
      setReviewSuggestion(null);
      pushToast({ title: "Enhancement diterapkan", variant: "success" });
    } catch (err) {
      const e = err as { message?: string };
      setReviewError(
        e?.message ?? "Gagal menyimpan enhancement. Dialog tetap terbuka — silakan coba lagi."
      );
    } finally {
      setAccepting(false);
    }
  };

  const handleReject = () => {
    setRejecting(true);
    // Reject is instant — just close without any persist
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
      setReviewError(
        e?.message ?? "Regenerate gagal. Silakan coba lagi."
      );
    } finally {
      setRegenerating(false);
    }
  };

  const handleSessionUndo = async () => {
    if (!reviewSectionId || !priorHtml || !projectId) return;
    setUndoing(true);
    setReviewError(null);
    try {
      await updateSection.mutateAsync({
        id: reviewSectionId,
        projectId,
        patch: { content_html: priorHtml },
      });
      setDirty(false);
      setReviewOpen(false);
      setReviewSuggestion(null);
      setPriorHtml(null);
      pushToast({ title: "Konten dikembalikan ke versi sebelumnya", variant: "success" });
    } catch (err) {
      const e = err as { message?: string };
      setReviewError(
        e?.message ?? "Gagal mengembalikan konten. Dialog tetap terbuka — silakan coba lagi."
      );
    } finally {
      setUndoing(false);
    }
  };

  const selectSection = (osId: string, sectionId?: string) => {
    if (sectionId) setActiveId(sectionId);
    setPickerOpen(false);
  };

  const sectionList = (
    <ul className="p-1.5 space-y-0.5">
      {outline.sections.map((os) => {
        const s = sectionsByOutline.get(os.id);
        const active = current?.id === s?.id || (!current && os.id === currentOutline?.id);
        return (
          <li key={os.id}>
            <button
              type="button"
              onClick={() => selectSection(os.id, s?.id)}
              className={cn(
                "w-full text-left p-2 rounded-lg transition-colors",
                active ? "bg-[var(--color-surface-2)]" : "hover:bg-[var(--color-surface-2)]"
              )}
            >
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-[var(--color-medium-gray)]">
                  {os.position}
                </span>
                <span className="text-sm font-medium text-[var(--color-deep-gray)] line-clamp-1 flex-1">
                  {s?.title ?? os.title}
                </span>
                {s ? (
                  <>
                    <Badge variant={s.status === "edited" ? "info" : "success"}>
                      {s.word_count}w
                    </Badge>
                    <span className="text-[11px] text-[var(--color-medium-gray)]">
                      {s.status}
                    </span>
                  </>
                ) : (
                  <Badge variant="default">pending</Badge>
                )}
              </div>
              {!s && (
                <div className="mt-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full"
                    loading={generate.isPending}
                    onClick={(e) => {
                      e.stopPropagation();
                      onGenerateOne(os.id);
                    }}
                  >
                    <Sparkles className="h-3.5 w-3.5" />
                    Generate
                  </Button>
                </div>
              )}
            </button>
          </li>
        );
      })}
    </ul>
  );

  return (
    <div className="grid md:grid-cols-[240px_1fr] lg:grid-cols-[260px_1fr] h-full">
      {/* Desktop / tablet sidebar */}
      <aside className="hidden md:flex flex-col border-r border-[var(--color-publiora-border)] bg-white overflow-y-auto min-h-0">
        <div className="p-2.5 flex items-center justify-between gap-2 sticky top-0 bg-white z-10 border-b border-[var(--color-publiora-border)]">
          <span className="text-sm font-semibold text-[var(--color-publiora-black)]">
            Sections
          </span>
          <Button
            size="sm"
            variant="outline"
            onClick={onGenerateAll}
            loading={generateAll.isPending}
            disabled={generateAll.isPending}
          >
            <Play className="h-3.5 w-3.5" />
            {generateAll.isPending ? "Generating…" : "Generate all"}
          </Button>
        </div>
        {sectionList}
      </aside>

      <div className="overflow-y-auto bg-[var(--color-surface-2)] min-h-0 flex flex-col">
        {/* Mobile section picker */}
        <div className="md:hidden sticky top-0 z-20 border-b border-[var(--color-publiora-border)] bg-white">
          <div className="p-2.5 flex items-center gap-2">
            <button
              type="button"
              onClick={() => setPickerOpen((v) => !v)}
              className="flex-1 min-w-0 flex items-center justify-between gap-2 rounded-lg border border-[var(--color-publiora-border)] bg-[var(--color-surface-2)] px-2.5 py-2 text-left"
              aria-expanded={pickerOpen}
              aria-haspopup="listbox"
            >
              <span className="min-w-0">
                <span className="block text-xs text-[var(--color-medium-gray)]">
                  Section aktif
                </span>
                <span className="block text-sm font-medium text-[var(--color-publiora-black)] truncate">
                  {currentLabel}
                </span>
              </span>
              <ChevronDown
                className={cn(
                  "h-4 w-4 shrink-0 text-[var(--color-medium-gray)] transition-transform",
                  pickerOpen && "rotate-180"
                )}
              />
            </button>
            <Button
              size="sm"
              variant="outline"
              onClick={onGenerateAll}
              loading={generateAll.isPending}
              disabled={generateAll.isPending}
              aria-label="Generate semua section"
            >
              <Play className="h-3.5 w-3.5" />
            </Button>
          </div>
          {pickerOpen && (
            <div
              role="listbox"
              className="max-h-[50vh] overflow-y-auto border-t border-[var(--color-publiora-border)] bg-white overscroll-contain"
            >
              {sectionList}
            </div>
          )}
        </div>

        {!current ? (
          <div className="p-6">
            <EmptyState
              icon={<FileText className="h-6 w-6" />}
              title="Belum ada section ter-generate"
              description="Pilih section di navigator, lalu generate untuk mulai menulis."
            />
          </div>
        ) : (
          <SectionEditor
            key={current.id}
            section={current}
            onSave={onSave}
            onRegenerate={() => onGenerateOne(current.outline_section_id)}
            onEnhance={(action) => onEnhance(current.id, action, current.content_html)}
            generating={generate.isPending}
            enhancing={enhance.isPending}
            onDirtyChange={setDirty}
          />
        )}
      </div>

      {/* Enhancement review dialog */}
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
    </div>
  );
}

function SectionEditor({
  section,
  onSave,
  onRegenerate,
  onEnhance,
  generating,
  enhancing,
  onDirtyChange,
}: {
  section: Section;
  onSave: (id: string, html: string, title: string) => void;
  onRegenerate: () => void;
  onEnhance: (action: EnhancementAction) => void;
  generating?: boolean;
  enhancing?: boolean;
  onDirtyChange?: (dirty: boolean) => void;
}) {
  const [title, setTitle] = React.useState(section.title);
  const [html, setHtml] = React.useState(section.content_html);
  const [localDirty, setLocalDirty] = React.useState(false);

  React.useEffect(() => {
    setTitle(section.title);
    setHtml(section.content_html);
    setLocalDirty(false);
  }, [section.id, section.title, section.content_html]);

  React.useEffect(() => {
    onDirtyChange?.(localDirty);
  }, [localDirty, onDirtyChange]);

  const onChange = (v: string) => {
    setHtml(v);
    setLocalDirty(true);
  };

  const wordCount = React.useMemo(() => {
    if (!html) return 0;
    const text = html.replace(/<[^>]*>/g, " ");
    const words = text
      .replace(/&[a-z]+;/gi, " ")
      .split(/\s+/)
      .filter(Boolean);
    return words.length;
  }, [html]);

  const hasContent = (html ?? "").replace(/<[^>]*>/g, "").trim().length > 0;

  return (
    <div className="p-3 space-y-3 max-w-3xl mx-auto">
      <div className="flex items-center gap-1.5 flex-wrap">
        <Input
          value={title}
          onChange={(e) => {
            setTitle(e.target.value);
            setLocalDirty(true);
          }}
          className="text-sm font-semibold min-w-[10rem] flex-1"
        />
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
          Regenerate
        </Button>
        <Button
          size="sm"
          disabled={!localDirty}
          onClick={() => onSave(section.id, html, title)}
        >
          <Save className="h-4 w-4" />
          Save
        </Button>
      </div>
      <RichTextEditor value={html} onChange={onChange} />
    </div>
  );
}
