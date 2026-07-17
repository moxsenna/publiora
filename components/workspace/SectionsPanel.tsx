"use client";

import * as React from "react";
import {
  useOutline,
  useSections,
  useGenerateSection,
  useGenerateAllSections,
  useUpdateSection,
} from "@/lib/api/hooks";
import { useUiStore } from "@/store/projectStore";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { Card, CardBody } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { RichTextEditor } from "@/components/editor/RichTextEditor";
import { Sparkles, FileText, Play, Save } from "lucide-react";
import type { Section } from "@/types/section";

export function SectionsPanel({ projectId }: { projectId: string }) {
  const { data: outline } = useOutline(projectId);
  const { data: sections, isLoading } = useSections(projectId);
  const generate = useGenerateSection();
  const generateAll = useGenerateAllSections();
  const updateSection = useUpdateSection();
  const pushToast = useUiStore((s) => s.pushToast);

  const [activeId, setActiveId] = React.useState<string | null>(null);

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

  return (
    <div className="grid md:grid-cols-[320px_1fr] h-full">
      <aside className="border-r border-[var(--color-publiora-border)] bg-white overflow-y-auto">
        <div className="p-4 flex items-center justify-between gap-2 sticky top-0 bg-white z-10 border-b border-[var(--color-publiora-border)]">
          <span className="text-sm font-semibold text-[var(--color-publiora-black)]">Sections</span>
          <Button size="sm" variant="outline" onClick={onGenerateAll} loading={generateAll.isPending}>
            <Play className="h-3.5 w-3.5" />
            Generate all
          </Button>
        </div>
        <ul className="p-2 space-y-1">
          {outline.sections.map((os) => {
            const s = sectionsByOutline.get(os.id);
            const active = current?.id === s?.id;
            return (
              <li key={os.id}>
                <button
                  onClick={() => s && setActiveId(s.id)}
                  className={
                    "w-full text-left p-3 rounded-xl transition-colors " +
                    (active ? "bg-[var(--color-surface-2)]" : "hover:bg-[var(--color-surface-2)]")
                  }
                >
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-[var(--color-soft-gray)]">{os.position}</span>
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
      </aside>

      <div className="overflow-y-auto bg-[var(--color-surface-2)]">
        {!current ? (
          <div className="p-6">
            <EmptyState
              icon={<FileText className="h-6 w-6" />}
              title="Belum ada section ter-generate"
              description="Klik tombol Generate di kiri untuk membuat tulisan section."
            />
          </div>
        ) : (
          <SectionEditor key={current.id} section={current} onSave={onSave} onRegenerate={() => onGenerateOne(current.outline_section_id)} generating={generate.isPending} />
        )}
      </div>
    </div>
  );
}

function SectionEditor({
  section,
  onSave,
  onRegenerate,
  generating,
}: {
  section: Section;
  onSave: (id: string, html: string, title: string) => void;
  onRegenerate: () => void;
  generating?: boolean;
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
      <div className="flex items-center gap-2">
        <Input
          value={title}
          onChange={(e) => {
            setTitle(e.target.value);
            setDirty(true);
          }}
          className="text-base font-semibold"
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
