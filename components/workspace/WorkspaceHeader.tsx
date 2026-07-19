"use client";

import * as React from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { ArrowLeft, Eye, Trash2 } from "lucide-react";
import type { Project } from "@/types/project";

interface WorkspaceHeaderProps {
  project: Project | undefined;
  isLoading: boolean;
  onPreview: () => void;
  onDelete: () => void;
}

export function WorkspaceHeader({
  project,
  isLoading,
  onPreview,
  onDelete,
}: WorkspaceHeaderProps) {
  return (
    <div className="border-b border-[var(--color-publiora-border)] bg-white px-2.5 sm:px-3 py-2">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 min-w-0">
          <Link href="/projects">
            <Button variant="ghost" size="icon" aria-label="Back to projects">
              <ArrowLeft className="h-3.5 w-3.5" />
            </Button>
          </Link>
          <div className="min-w-0">
            {isLoading ? (
              <Skeleton className="h-4 w-40" />
            ) : (
              <h1 className="text-sm font-semibold truncate text-[var(--color-publiora-black)]">
                {project?.title ?? "Untitled"}
              </h1>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {/* Preview — opens review stage */}
          <Button
            size="sm"
            variant="outline"
            onClick={onPreview}
            aria-label="Preview ebook"
          >
            <Eye className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Preview</span>
          </Button>

          <Button
            size="sm"
            variant="ghost"
            className="hidden sm:inline-flex text-[var(--color-danger)]"
            onClick={onDelete}
            aria-label="Delete project"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}
