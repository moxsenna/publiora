"use client";

import Link from "next/link";
import { ArrowLeft, Eye } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { readerId } from "@/lib/i18n/id/reader";
import type { ReaderMode } from "@/types/reader";

/**
 * Banners shown above the reading area depending on reader mode.
 * - creator_preview: explains that nothing has been published yet.
 * - claimed_reader: quiet — reading means the ebook is already owned.
 */
export function ReaderPreviewBanner({
  mode,
  backHref,
}: {
  mode: ReaderMode;
  backHref: string;
}) {
  if (mode !== "creator_preview") return null;

  return (
    <div className="border-b border-[var(--color-gold)]/40 bg-[var(--color-gold)]/10 px-4 py-3">
      <div className="max-w-6xl mx-auto flex items-center gap-3">
        <Eye aria-hidden="true" className="h-5 w-5 text-[var(--color-gold)] shrink-0" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-[var(--color-publiora-black)]">
            {readerId.previewModeTitle}
          </p>
          <p className="text-xs text-[var(--color-medium-gray)]">
            {readerId.previewModeBody}
          </p>
        </div>
        <Link href={backHref} className="shrink-0">
          <Button variant="ghost" size="sm">
            <ArrowLeft aria-hidden="true" className="h-3.5 w-3.5 mr-1.5" />
            {readerId.previewBackToProject}
          </Button>
        </Link>
      </div>
    </div>
  );
}