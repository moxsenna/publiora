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
import { Sparkles, FileText, Play, Save, Wand2, ChevronDown } from "lucide-react";
import type { Section } from "@/types/section";
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
          description="Buat outline di tab Outline dulu sebelum generate sections."
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
    try {
      await generateAll.mutateAsync(projectId);
      pushToast({ title: "Semua section ter-generate", variant: "success" });
    } catch (err) {
      const e = err as { code?: string };
      pushToast({
        title: e?.code === "insufficient_credits" ? "Kredit tidak cukup" : "Generate gagal",
        description: e?.code === "insufficient_credits" ? "Buka Billing untuk top-up." : undefined,
        variant: "danger",
      });
    }
  };

  const onGenerateOne = async (outlineSectionId: string) => {
    try {
      const s = await generate.mutateAsync({ projectId, outlineSectionId });
      setActiveId(s.id);
    } catch {
      pushToast({ title: "Generate gagal", variant: "danger" });
    }
  };

  const onSave = async (sectionId: string, html: string, title: string) => {
    try {
      await updateSection.mutateAsync({
        id: sectionId,
        projectId,
        patch: { content_html: html, title },
      });
      pushToast({ title: "Section disimpan", variant: "success" });
    } catch {
      pushToast({ title: "Simpan gagal", variant: "danger" });
    }
  };

  const onEnhance = async (sectionId: string) => {
    try {
      const s = await enhance.mutateAsync({ projectId, sectionId });
      setActiveId(s.id);
      pushToast({ title: "Section diperhalus", variant: "success" });
    } catch (err) {
      const e = err as { code?: string };
      pushToast({
        title:
          e?.code === "insufficient_credits"
            ? "Kredit tidak cukup"
            : "Enhance gagal",
        description:
          e?.code === "insufficient_credits"
            ? "Buka Billing untuk top-up."
            : undefined,
        variant: "danger",
      });
    }
  };

  const selectSection = (osId: string, sectionId?: string) => {
    if (sectionId) setActiveId(sectionId);
    setPickerOpen(false);
  };

  const sectionList = (
    <ul className="p-2 space-y-1">
      {outline.sections.map((os) => {
        const s = sectionsByOutline.get(os.id);
        const active = current?.id === s?.id || (!current && os.id === currentOutline?.id);
        return (
          <li key={os.id}>
            <button
              type="button"
              onClick={() => selectSection(os.id, s?.id)}
              className={cn(
                "w-full text-left p-3 rounded-xl transition-colors",
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
                  <Badge variant={s.status === "edited" ? "info" : "success"}>
                    {s.word_count}w
                  </Badge>
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
    <div className="grid md:grid-cols-[280px_1fr] lg:grid-cols-[320px_1fr] h-full">
      {/* Desktop / tablet sidebar */}
      <aside className="hidden md:flex flex-col border-r border-[var(--color-publiora-border)] bg-white overflow-y-auto min-h-0">
        <div className="p-4 flex items-center justify-between gap-2 sticky top-0 bg-white z-10 border-b border-[var(--color-publiora-border)]">
          <span className="text-sm font-semibold text-[var(--color-publiora-black)]">
            Sections
          </span>
          <Button
            size="sm"
            variant="outline"
            onClick={onGenerateAll}
            loading={generateAll.isPending}
          >
            <Play className="h-3.5 w-3.5" />
            Generate all
          </Button>
        </div>
        {sectionList}
      </aside>

      <div className="overflow-y-auto bg-[var(--color-surface-2)] min-h-0 flex flex-col">
        {/* Mobile section picker */}
        <div className="md:hidden sticky top-0 z-20 border-b border-[var(--color-publiora-border)] bg-white">
          <div className="p-3 flex items-center gap-2">
            <button
              type="button"
              onClick={() => setPickerOpen((v) => !v)}
              className="flex-1 min-w-0 flex items-center justify-between gap-2 rounded-xl border border-[var(--color-publiora-border)] bg-[var(--color-surface-2)] px-3 py-2.5 text-left"
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
              description="Pilih section di atas, lalu generate untuk mulai menulis."
            />
          </div>
        ) : (
          <SectionEditor
            key={current.id}
            section={current}
            onSave={onSave}
            onRegenerate={() => onGenerateOne(current.outline_section_id)}
            onEnhance={() => onEnhance(current.id)}
            generating={generate.isPending}
            enhancing={enhance.isPending}
          />
        )}
      </div>
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
}: {
  section: Section;
  onSave: (id: string, html: string, title: string) => void;
  onRegenerate: () => void;
  onEnhance: () => void;
  generating?: boolean;
  enhancing?: boolean;
}) {
  const [title, setTitle] = React.useState(section.title);
  const [html, setHtml] = React.useState(section.content_html);
  const [dirty, setDirty] = React.useState(false);

  React.useEffect(() => {
    setTitle(section.title);
    setHtml(section.content_html);
    setDirty(false);
  }, [section.id, section.title, section.content_html]);

  const onChange = (v: string) => {
    setHtml(v);
    setDirty(true);
  };

  return (
    <div className="p-4 space-y-4 max-w-3xl mx-auto">
      <div className="flex items-center gap-2 flex-wrap">
        <Input
          value={title}
          onChange={(e) => {
            setTitle(e.target.value);
            setDirty(true);
          }}
          className="text-base font-semibold min-w-[12rem] flex-1"
        />
        <Button
          variant="outline"
          size="sm"
          loading={enhancing}
          onClick={onEnhance}
        >
          <Wand2 className="h-4 w-4" />
          Enhance
        </Button>
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
          disabled={!dirty}
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
