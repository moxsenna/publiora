"use client";

import * as React from "react";
import { useOutline, useSections } from "@/lib/api/hooks";
import { EmptyState } from "@/components/ui/EmptyState";
import { BookOpen } from "lucide-react";

export function PreviewPanel({ projectId }: { projectId: string }) {
  const { data: outline } = useOutline(projectId);
  const { data: sections } = useSections(projectId);

  const sorted = React.useMemo(
    () => [...(sections ?? [])].sort((a, b) => a.position - b.position),
    [sections]
  );

  if (!outline || sorted.length === 0) {
    return (
      <div className="p-6">
        <EmptyState
          icon={<BookOpen className="h-6 w-6" />}
          title="Preview belum tersedia"
          description="Generate section di tab Sections untuk melihat preview ebook."
        />
      </div>
    );
  }

  return (
    <div className="bg-[var(--color-surface-2)] overflow-y-auto">
      <div className="max-w-2xl mx-auto py-8 px-4">
        <div
          className="rounded-2xl p-8 mb-8 text-white"
          style={{ background: "#0A0A0A" }}
        >
          <div className="text-xs uppercase tracking-[0.2em] text-[var(--color-gold)]">
            Preview
          </div>
          <h1 className="mt-2 text-3xl font-bold">{outline.title}</h1>
          {outline.description && (
            <p className="mt-2 text-white/80">{outline.description}</p>
          )}
        </div>
        <div className="reader-prose bg-white rounded-[var(--radius-card)] border border-[var(--color-publiora-border)]/50 p-8 md:p-10 shadow-[var(--shadow-card)]">
          {sorted.map((s) => (
            <section key={s.id} className="mb-10">
              <h1>{s.title}</h1>
              <div dangerouslySetInnerHTML={{ __html: s.content_html }} />
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
