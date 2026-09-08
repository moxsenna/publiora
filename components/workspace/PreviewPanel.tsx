"use client";

import * as React from "react";
import { useProject, useSections } from "@/lib/api/hooks";
import { EmptyState } from "@/components/ui/EmptyState";
import { Button } from "@/components/ui/Button";
import { BookOpen, ExternalLink, Eye, Clock, FileText } from "lucide-react";
import { workspaceId } from "@/lib/i18n/id";
import { buildProjectPreviewUrl } from "@/lib/urls";

/**
 * Compact preview card — single renderer rule (§7.4):
 * the full Reader renderer lives at /projects/:id/preview, this panel only
 * links to it, never duplicates the ebook body.
 */
export function PreviewPanel({ projectId }: { projectId: string }) {
  const { data: project } = useProject(projectId);
  const { data: sections } = useSections(projectId);

  const readySections = (sections ?? []).filter(
    (s) => s.status === "generated" || s.status === "edited"
  );
  const readyCount = readySections.length;
  const totalWords = readySections.reduce(
    (acc, s) => acc + (s.word_count || 0),
    0
  );
  const readTimeMinutes = Math.max(1, Math.round(totalWords / 200));

  const previewUrl = buildProjectPreviewUrl(projectId);

  if (readyCount === 0) {
    return (
      <div className="bg-white rounded-2xl border border-[var(--color-publiora-border)] p-5 text-center">
        <EmptyState
          icon={<BookOpen className="h-6 w-6" />}
          title={workspaceId.previewUnavailable}
          description={workspaceId.previewEmptyDesc}
        />
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-[var(--color-publiora-border)] shadow-xs p-4 sm:p-5 space-y-4">
      <div className="flex items-start gap-3">
        <div className="h-10 w-10 rounded-xl bg-[var(--color-publiora-blue)]/10 text-[var(--color-publiora-blue)] grid place-items-center shrink-0">
          <BookOpen className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <h4 className="text-sm font-bold text-[var(--color-publiora-black)] leading-snug line-clamp-2">
            {project?.title ?? "Ebook"}
          </h4>
          {project?.subtitle && (
            <p className="text-xs text-[var(--color-medium-gray)] mt-0.5 line-clamp-1">
              {project.subtitle}
            </p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 py-2 px-3 rounded-xl bg-[var(--color-surface-2)] text-xs text-[var(--color-deep-gray)]">
        <div className="flex items-center gap-1.5">
          <FileText className="h-3.5 w-3.5 text-[var(--color-medium-gray)]" />
          <span>{readyCount} bab siap</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Clock className="h-3.5 w-3.5 text-[var(--color-medium-gray)]" />
          <span>~{readTimeMinutes} menit baca</span>
        </div>
      </div>

      <a
        href={previewUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="block w-full"
      >
        <Button variant="outline" size="sm" className="w-full justify-center">
          <Eye className="h-4 w-4 mr-1" />
          {workspaceId.previewAsReader}
          <ExternalLink className="h-3.5 w-3.5 ml-auto opacity-60" />
        </Button>
      </a>
    </div>
  );
}
