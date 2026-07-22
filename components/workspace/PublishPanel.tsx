"use client";

import * as React from "react";
import Link from "next/link";
import { usePublishEbook } from "@/lib/api/hooks";
import { useUiStore } from "@/store/projectStore";
import { Button } from "@/components/ui/Button";
import { Radio } from "@/components/ui/Radio";
import { Label } from "@/components/ui/Input";
import {
  Rocket,
  AlertTriangle,
  CheckCircle2,
  ExternalLink,
  BookOpen,
  Tag,
  Target,
  Users,
} from "lucide-react";
import type { ProjectWorkflowState } from "@/types/workflow";

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
  const [visibility, setVisibility] = React.useState<"public" | "private">(
    "public",
  );
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
  const publishLabel = isPublished ? "Terbitkan ulang" : "Terbitkan sekarang";
  const publishDescription = isPublished
    ? "This will replace the previous publication snapshot."
    : "All sections will be snapshotted and published to the reader.";

  const onPublish = async () => {
    if (isPublishing || !canPublish || hasBlockers) return;

    try {
      const ebook = await publish.mutateAsync({
        project_id: projectId,
        is_public: visibility === "public",
      });
      setPublishDone(true);
      setPublishedSlugState(ebook.slug ?? null);
      setPublishedIdState(ebook.id ?? null);
      pushToast({
        title: "Ebook published",
        description: "Your ebook is now live.",
        variant: "success",
      });
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : "Gagal menerbitkan. Silakan coba lagi.";
      pushToast({ title: message, variant: "danger" });
    }
  };

  // Calculate writing progress
  const progressPct = workflow?.writingProgress ?? 0;

  // Determine CTA status string
  const ctaStatus = (() => {
    if (!hasCta) return "Not configured";
    if (ctaText && ctaGoal) return ctaGoal.replace(/_/g, " ");
    if (ctaGoal) return `${ctaGoal.replace(/_/g, " ")} (no text)`;
    return "Configured";
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
            Published
            {publishedSlugState && (
              <Link
                href={`/read/${publishedSlugState}`}
                target="_blank"
                rel="noopener noreferrer"
                className="ml-auto text-[var(--color-publiora-blue)] hover:underline inline-flex items-center gap-1"
              >
                View reader <ExternalLink className="h-3 w-3" />
              </Link>
            )}
          </div>
        )}

        {/* Summary grid */}
        <div className="grid grid-cols-2 gap-3">
          <SummaryItem
            icon={<BookOpen className="h-3.5 w-3.5" />}
            label="Title"
            value={projectTitle ?? "Untitled"}
          />
          <SummaryItem
            icon={<Users className="h-3.5 w-3.5" />}
            label="Author"
            value={projectAuthor ?? "Unknown"}
          />
          {projectSubtitle && (
            <SummaryItem
              label="Subtitle"
              value={projectSubtitle}
              className="col-span-2"
            />
          )}
          <SummaryItem
            label="Sections"
            value={`${sectionsCount} section${sectionsCount !== 1 ? "s" : ""}`}
          />
          <SummaryItem
            icon={<Tag className="h-3.5 w-3.5" />}
            label="CTA"
            value={ctaStatus}
          />
          {ctaText && (
            <SummaryItem
              label="CTA text"
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
            <span>Writing completion</span>
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
              {blockers.length} issue{blockers.length > 1 ? "s" : ""} to resolve
            </h3>
          </div>

          {reviewBlockers.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-xs font-semibold text-[var(--color-medium-gray)] uppercase tracking-wide">
                Review issues
              </h4>
              <ul className="space-y-1.5">
                {reviewBlockers.map((b) => (
                  <li
                    key={b.code}
                    className="flex items-start gap-2 text-sm text-[var(--color-deep-gray)]"
                  >
                    <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5 text-[var(--color-gold)]" />
                    <div className="min-w-0 flex-1 space-y-0.5">
                      <span>{b.message}</span>
                      <button
                        type="button"
                        onClick={() => onNavigate(b.targetStep)}
                        className="block text-xs font-medium text-[var(--color-publiora-blue)] hover:underline"
                      >
                        Go to {b.targetStep}
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
                Other blockers
              </h4>
              <ul className="space-y-1.5">
                {otherBlockers.map((b) => (
                  <li
                    key={b.code}
                    className="flex items-start gap-2 text-sm text-[var(--color-deep-gray)]"
                  >
                    <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5 text-[var(--color-gold)]" />
                    <div className="min-w-0 flex-1 space-y-0.5">
                      <span>{b.message}</span>
                      <button
                        type="button"
                        onClick={() => onNavigate(b.targetStep)}
                        className="block text-xs font-medium text-[var(--color-publiora-blue)] hover:underline"
                      >
                        Go to {b.targetStep}
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Warnings section */}
      {!hasBlockers &&
        checks.filter((c) => c.severity === "warning").length > 0 && (
          <div className="bg-[var(--color-surface-2)] border border-[var(--color-publiora-border)] rounded-xl p-4 space-y-2">
            <h4 className="text-xs font-semibold text-[var(--color-gold)] uppercase tracking-wide">
              Warnings
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
                    <span>{c.label}</span>
                  </li>
                ))}
            </ul>
          </div>
        )}

      {/* Publish controls */}
      <div className="bg-white rounded-[var(--radius-card)] border border-[var(--color-publiora-border)] shadow-[var(--shadow-card)] p-6 space-y-4">
        {/* Visibility selection */}
        <div>
          <Label>Visibility</Label>
          <p className="text-xs text-[var(--color-medium-gray)] mb-2">
            Public makes the ebook accessible via its reader slug. Private hides it
            from public view.
          </p>
          <div className="space-y-2">
            <Radio
              checked={visibility === "public"}
              onChange={() => setVisibility("public")}
              label="Public"
              description="Slug is active and visible to everyone."
            />
            <Radio
              checked={visibility === "private"}
              onChange={() => setVisibility("private")}
              label="Private"
              description="Only accessible via claim links."
            />
          </div>
        </div>

        {/* CTA preview if configured */}
        {hasCta && ctaText && (
          <div className="border border-[var(--color-publiora-border)] rounded-lg p-3 bg-[var(--color-surface-2)]">
            <div className="flex items-center gap-1.5 text-xs text-[var(--color-medium-gray)] mb-1">
              <Target className="h-3 w-3" />
              Reader CTA preview
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

        {/* Error message for API-level blockers */}
        {publish.isError && !publishDone && (
          <div className="rounded-lg bg-[var(--color-danger)]/10 border border-[var(--color-danger)]/30 p-3 text-sm text-[var(--color-danger)]">
            {(publish.error as Error)?.message ??
              "Publish failed. Check for blockers and try again."}
          </div>
        )}

        <div className="flex items-center gap-3 pt-1">
          {publishDone && publishedSlugState && (
            <Link href={`/read/${publishedSlugState}`} target="_blank">
              <Button variant="outline" size="sm">
                <ExternalLink className="h-4 w-4" />
                Open reader
              </Button>
            </Link>
          )}
          {publishDone && publishedIdState && (
            <Link href={`/published/${publishedIdState}`}>
              <Button variant="ghost" size="sm">
                Manage claims
              </Button>
            </Link>
          )}

          <div className="ml-auto">
            <Button
              onClick={onPublish}
              loading={isPublishing}
              disabled={!canPublish || hasBlockers || isPublishing}
              variant="gold"
              size="sm"
            >
              <Rocket className="h-4 w-4" />
              {isPublished ? "Republish" : "Publish"}
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
