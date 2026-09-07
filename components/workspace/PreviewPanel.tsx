"use client";

import * as React from "react";
import { useProject, useSections } from "@/lib/api/hooks";
import { EmptyState } from "@/components/ui/EmptyState";
import { Button } from "@/components/ui/Button";
import { BookOpen, ExternalLink, Eye } from "lucide-react";
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

  const readyCount = (sections ?? []).filter(
    (s) => s.status === "generated" || s.status === "edited"
  ).length;

  const previewUrl = buildProjectPreviewUrl(projectId);

  if (readyCount === 0) {
    return (
      <div className="p-6">
        <EmptyState
          icon={<BookOpen className="h-6 w-6" />}
          title={workspaceId.previewUnavailable}
          description={workspaceId.previewEmptyDesc}
        />
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="bg-white rounded-[var(--radius-card)] border border-[var(--color-publiora-border)] shadow-[var(--shadow-card)] p-6 space-y-4">
        <div className="flex items-start gap-3">
          <div className="h-10 w-10 rounded-xl bg-[var(--color-publiora-blue)]/10 grid place-items-center shrink-0">
            <BookOpen className="h-5 w-5 text-[var(--color-publiora-blue)]" />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-base font-semibold text-[var(--color-publiora-black)] truncate">
              {project?.title ?? "Ebook"}
            </h3>
            <p className="text-sm text-[var(--color-medium-gray)] mt-0.5">
              {readyCount} {workspaceId.previewSectionCount}
            </p>
          </div>
        </div>

        <a
          href={previewUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-block w-full"
        >
          <Button variant="outline" className="w-full">
            <Eye className="h-4 w-4" />
            {workspaceId.previewAsReader}
            <ExternalLink className="h-3.5 w-3.5 ml-auto opacity-60" />
          </Button>
        </a>
      </div>
    </div>
  );
}