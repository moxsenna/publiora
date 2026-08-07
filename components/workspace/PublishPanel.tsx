"use client";

import * as React from "react";
import Link from "next/link";
import { usePublishEbook } from "@/lib/api/hooks";
import { useUiStore } from "@/store/projectStore";
import { Button } from "@/components/ui/Button";
import {
  Rocket,
  AlertTriangle,
  CheckCircle2,
  ExternalLink,
  BookOpen,
  Tag,
  Target,
  Users,
  Eye,
  Link2,
} from "lucide-react";
import type { ProjectWorkflowState } from "@/types/workflow";
import { getPublishBlockerCopy, getPublishCheckCopy, publishId } from "@/lib/i18n/id/publish";
import { ctaGoalDisplayLabel } from "@/lib/projects/project-type-copy";
import { buildProjectPreviewUrl, buildPublishedReaderUrl } from "@/lib/urls";
import { workspaceId } from "@/lib/i18n/id";

interface PublishPanelProps {
  projectId: string;
  workflow: ProjectWorkflowState | null;
  projectTitle?: string | null;
  projectSubtitle?: string | null;
  projectAuthor?: string | null;
  sectionsCount?: number;
  hasCta?: boolean;
  ctaGoal?: string | null;
  ctaText?: string | null;
  ctaUrl?: string | null;
  publishedSlug?: string | null;
  publishedId?: string | null;
  isPublished?: boolean;
  onNavigate: (step: string) => void;
}

export function PublishPanel({
  projectId,
  workflow,
  projectTitle,
  projectSubtitle,
  projectAuthor,
  sectionsCount = 0,
  hasCta = false,
  ctaGoal,
  ctaText,
  ctaUrl,
  publishedSlug,
  publishedId,
  isPublished = false,
  onNavigate,
}: PublishPanelProps) {
  const publish = usePublishEbook();
  const pushToast = useUiStore((s) => s.pushToast);
  const [publishDone, setPublishDone] = React.useState(false);
  const [publishedSlugState, setPublishedSlugState] = React.useState<
    string | null
  >(publishedSlug ?? null);
  const [publishedIdState, setPublishedIdState] = React.useState<string | null>(
    publishedId ?? null,
  );

  const blockers = workflow?.blockers ?? [];
  const canPublish = workflow?.canPublish ?? false;
  const hasBlockers = blockers.length > 0;
  const isPublishing = publish.isPending;

  const checks = workflow?.checks ?? [];

  // Re-publish copy
  const publishLabel = isPublished ? publishId.republish : publishId.publish;
  const publishDescription =
    "Ebook akan disimpan sebagai versi terbit dan hanya dapat " +
    "dibuka oleh Anda atau pembaca yang berhasil melakukan klaim.";

  const onPublish = async () => {
    if (isPublishing || !canPublish || hasBlockers) return;

    try {
      const ebook = await publish.mutateAsync({
        project_id: projectId,
      });
      setPublishDone(true);
      setPublishedSlugState(ebook.slug ?? null);
      setPublishedIdState(ebook.id ?? null);
      pushToast({
        title: publishId.success,
        description: "Ebook Anda kini tersedia untuk pembaca melalui tautan klaim.",
        variant: "success",
      });
    } catch {
      pushToast({ title: publishId.failed, variant: "danger" });
    }
  };

  // Calculate writing progress
  const progressPct = workflow?.writingProgress ?? 0;

  // Determine CTA status string
  const ctaStatus = (() => {
    if (!hasCta) return "Belum diatur";
    if (ctaText && ctaGoal) return ctaGoalDisplayLabel(ctaGoal);
    if (ctaGoal) return `${ctaGoalDisplayLabel(ctaGoal)} (tanpa teks)`;
    return "Sudah diatur";
  })();

  // Determine blockers for specific steps
  const reviewBlockers = blockers.filter((b) => b.targetStep === "review");
  const otherBlockers = blockers.filter((b) => b.targetStep !== "review");

  return (
    <div className="max-w-2xl mx-auto py-8 px-4 space-y-6">
      {/* Summary Card */}
      <div className="bg-white rounded-[var(--radius-card)] border border-[var(--color-publiora-border)] shadow-[var(--shadow-card)] p-6 space-y-4">
        <div className="flex items-center gap-2">
          <Rocket className="h-5 w-5 text-[var(--color-gold)]" />
          <h2 className="text-lg font-semibold text-[var(--color-publiora-black)]">
            {isPublished ? "Ringkasan publikasi" : "Terbitkan ebook Anda"}
          </h2>
        </div>

        {isPublished && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[var(--color-success)]/10 text-[var(--color-success)] text-sm font-medium">
            <CheckCircle2 className="h-4 w-4" />
            Sudah terbit
            {publishedSlugState && (
              <Link
                href={buildPublishedReaderUrl(publishedSlugState)}
                target="_blank"
                rel="noopener noreferrer"
                className="ml-auto text-[var(--color-publiora-blue)] hover:underline inline-flex items-center gap-1"
              >
                Buka pembaca <ExternalLink className="h-3 w-3" />
              </Link>
            )}
          </div>
        )}

        {/* Summary grid */}
        <div className="grid grid-cols-2 gap-3">
          <SummaryItem
            icon={<BookOpen className="h-3.5 w-3.5" />}
            label="Judul"
            value={projectTitle ?? "Tanpa judul"}
          />
          <SummaryItem
            icon={<Users className="h-3.5 w-3.5" />}
            label="Penulis"
            value={projectAuthor ?? "Belum diisi"}
          />
          {projectSubtitle && (
            <SummaryItem
              label="Subjudul"
              value={projectSubtitle}
              className="col-span-2"
            />
          )}
          <SummaryItem
            label="Bagian"
            value={`${sectionsCount} bagian`}
          />
          <SummaryItem
            icon={<Tag className="h-3.5 w-3.5" />}
            label="CTA"
            value={ctaStatus}
          />
          {ctaText && (
            <SummaryItem
              label="Teks CTA"
              value={ctaText}
              className="col-span-2"
            />
          )}
          {ctaUrl && (
            <SummaryItem
              label="CTA URL"
              value={ctaUrl}
              className="col-span-2"
            />
          )}
        </div>

        {/* Progress bar */}
        <div>
          <div className="flex justify-between text-xs text-[var(--color-medium-gray)] mb-1">
            <span>Progres penulisan</span>
            <span>{progressPct}%</span>
          </div>
          <div className="h-1.5 bg-[var(--color-surface-3)] rounded-full overflow-hidden">
            <div
              className="h-full bg-[var(--color-publiora-blue)] transition-[width] duration-300 rounded-full"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>
      </div>

      {/* Blockers section */}
      {hasBlockers && (
        <div className="bg-[var(--color-surface-2)] border border-[var(--color-publiora-border)] rounded-xl p-5 space-y-3">
          <div className="flex items-center gap-2 text-[var(--color-danger)]">
            <AlertTriangle className="h-4 w-4" />
            <h3 className="text-sm font-semibold">
              {blockers.length} masalah perlu diselesaikan
            </h3>
          </div>

          {reviewBlockers.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-xs font-semibold text-[var(--color-medium-gray)] uppercase tracking-wide">
                Masalah tinjauan
              </h4>
              <ul className="space-y-1.5">
                {reviewBlockers.map((b) => (
                  <li
                    key={b.code}
                    className="flex items-start gap-2 text-sm text-[var(--color-deep-gray)]"
                  >
                    <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5 text-[var(--color-gold)]" />
                    <div className="min-w-0 flex-1 space-y-0.5">
                      <span>{getPublishBlockerCopy(b.code)}</span>
                      <button
                        type="button"
                        onClick={() => onNavigate(b.targetStep)}
                        className="block text-xs font-medium text-[var(--color-publiora-blue)] hover:underline"
                      >
                        Tinjau masalah
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {otherBlockers.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-xs font-semibold text-[var(--color-medium-gray)] uppercase tracking-wide">
                Penghalang lain
              </h4>
              <ul className="space-y-1.5">
                {otherBlockers.map((b) => (
                  <li
                    key={b.code}
                    className="flex items-start gap-2 text-sm text-[var(--color-deep-gray)]"
                  >
                    <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5 text-[var(--color-gold)]" />
                    <div className="min-w-0 flex-1 space-y-0.5">
                      <span>{getPublishBlockerCopy(b.code)}</span>
                      <button
                        type="button"
                        onClick={() => onNavigate(b.targetStep)}
                        className="block text-xs font-medium text-[var(--color-publiora-blue)] hover:underline"
                      >
                        Tinjau masalah
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Peringatan section */}
      {!hasBlockers &&
        checks.filter((c) => c.severity === "warning").length > 0 && (
          <div className="bg-[var(--color-surface-2)] border border-[var(--color-publiora-border)] rounded-xl p-4 space-y-2">
            <h4 className="text-xs font-semibold text-[var(--color-gold)] uppercase tracking-wide">
              Peringatan
            </h4>
            <ul className="space-y-1">
              {checks
                .filter((c) => c.severity === "warning")
                .map((c) => (
                  <li
                    key={c.id}
                    className="flex items-start gap-2 text-xs text-[var(--color-medium-gray)]"
                  >
                    <span className="shrink-0 mt-0.5">&#x2139;</span>
                    <span>{getPublishCheckCopy(c.code ?? c.id)}</span>
                  </li>
                ))}
            </ul>
          </div>
        )}

      {/* Publish controls */}
      <div className="bg-white rounded-[var(--radius-card)] border border-[var(--color-publiora-border)] shadow-[var(--shadow-card)] p-6 space-y-4">
        {/* Claim-only distribution note */}
        <div className="flex items-start gap-2.5 border border-[var(--color-publiora-border)] rounded-lg p-3 bg-[var(--color-surface-2)]">
          <Link2 className="h-4 w-4 shrink-0 mt-0.5 text-[var(--color-gold)]" />
          <div className="space-y-0.5 text-xs text-[var(--color-medium-gray)]">
            <p className="text-sm font-medium text-[var(--color-deep-gray)]">
              Terbitkan untuk pembaca
            </p>
            <p>{publishDescription}</p>
          </div>
        </div>

        {/* CTA preview if configured */}
        {hasCta && ctaText && (
          <div className="border border-[var(--color-publiora-border)] rounded-lg p-3 bg-[var(--color-surface-2)]">
            <div className="flex items-center gap-1.5 text-xs text-[var(--color-medium-gray)] mb-1">
              <Target className="h-3 w-3" />
              Pratinjau CTA pembaca
            </div>
            {ctaUrl ? (
              <a
                href={ctaUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-sm font-medium text-[var(--color-publiora-blue)] hover:underline"
              >
                {ctaText}
                <ExternalLink className="h-3 w-3" />
              </a>
            ) : (
              <span className="text-sm font-medium text-[var(--color-deep-gray)]">
                {ctaText}
              </span>
            )}
          </div>
        )}

        <p className="text-xs text-[var(--color-medium-gray)]">
          {publishDescription}
        </p>

        {/* Post-publish guide: create the claim link */}
        {publishDone && (
          <div className="flex items-start gap-2.5 rounded-lg border border-[var(--color-success)]/30 bg-[var(--color-success)]/10 p-3">
            <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5 text-[var(--color-success)]" />
            <div className="space-y-0.5">
              <p className="text-sm font-semibold text-[var(--color-success)]">
                {publishId.success}
              </p>
              <p className="text-xs text-[var(--color-medium-gray)]">
                {publishId.guideLine}
              </p>
            </div>
          </div>
        )}

        {/* Error message for API-level blockers */}
        {publish.isError && !publishDone && (
          <div className="rounded-lg bg-[var(--color-danger)]/10 border border-[var(--color-danger)]/30 p-3 text-sm text-[var(--color-danger)]">
            {publishId.failed}
          </div>
        )}

        <div className="flex items-center gap-3 pt-1">
          {publishDone && publishedSlugState && (
            <Link
              href={buildPublishedReaderUrl(publishedSlugState)}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Button variant="outline" size="sm">
                <BookOpen className="h-4 w-4" />
                {publishId.previewPublished}
              </Button>
            </Link>
          )}
          {publishDone && publishedIdState && (
            <Link href={`/published/${publishedIdState}?tab=claims&create=1`}>
              <Button size="sm">
                <Link2 className="h-4 w-4" />
                {publishId.createLink}
              </Button>
            </Link>
          )}

          <div className="ml-auto flex items-center gap-2">
            <a
              href={buildProjectPreviewUrl(projectId)}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Button variant="outline" size="sm">
                <Eye className="h-4 w-4" />
                {workspaceId.previewAsReader}
              </Button>
            </a>
            <Button
              onClick={onPublish}
              loading={isPublishing}
              disabled={!canPublish || hasBlockers || isPublishing}
              variant="gold"
              size="sm"
            >
              <Rocket className="h-4 w-4" />
              {publishLabel}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Summary item helper
// ---------------------------------------------------------------------------

function SummaryItem({
  icon,
  label,
  value,
  className = "",
}: {
  icon?: React.ReactNode;
  label: string;
  value: string;
  className?: string;
}) {
  return (
    <div className={`space-y-0.5 ${className}`}>
      <div className="flex items-center gap-1 text-xs text-[var(--color-medium-gray)]">
        {icon}
        <span className="uppercase tracking-wide">{label}</span>
      </div>
      <p className="text-sm font-medium text-[var(--color-deep-gray)] truncate">
        {value}
      </p>
    </div>
  );
}
