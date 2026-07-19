"use client";

import * as React from "react";
import {
  useProject,
  useOutline,
  useSections,
  useUpdateProject,
} from "@/lib/api/hooks";
import { useUiStore } from "@/store/projectStore";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { ReviewChecklist } from "@/components/workspace/ReviewChecklist";
import { CtaComposer } from "@/components/workspace/CtaComposer";
import { TitleSuggestions } from "@/components/workspace/TitleSuggestions";
import { PreviewPanel } from "@/components/workspace/PreviewPanel";
import {
  ClipboardCheck,
  Rocket,
  BookOpen,
  ArrowRight,
} from "lucide-react";
import type { ProjectWorkflowStep, ProjectWorkflowState } from "@/types/workflow";

// ---------------------------------------------------------------------------
// ReviewPanel
// ---------------------------------------------------------------------------

interface ReviewPanelProps {
  projectId: string;
  workflow: ProjectWorkflowState | null;
  onNavigate?: (step: ProjectWorkflowStep) => void;
  onContinueToPublish?: () => void;
}

export function ReviewPanel({
  projectId,
  workflow,
  onNavigate,
  onContinueToPublish,
}: ReviewPanelProps) {
  const { data: project } = useProject(projectId);
  const updateProject = useUpdateProject();
  const pushToast = useUiStore((s) => s.pushToast);

  const checks = workflow?.checks ?? [];
  const blockerCount = checks.filter((c) => c.severity === "blocker").length;
  const warningCount = checks.filter((c) => c.severity === "warning").length;
  const passCount = checks.filter((c) => c.severity === "pass").length;

  // Local title / subtitle editing
  const [title, setTitle] = React.useState(project?.title ?? "");
  const [subtitle, setSubtitle] = React.useState(project?.subtitle ?? "");

  React.useEffect(() => {
    if (project) {
      setTitle(project.title ?? "");
      setSubtitle(project.subtitle ?? "");
    }
  }, [project]);

  const saveTitleAndSubtitle = async () => {
    try {
      await updateProject.mutateAsync({
        id: projectId,
        patch: { title, subtitle: subtitle || undefined },
      });
      pushToast({ title: "Title and subtitle saved", variant: "success" });
    } catch {
      pushToast({ title: "Failed to save title", variant: "danger" });
    }
  };

  const titleDirty = title !== (project?.title ?? "") || subtitle !== (project?.subtitle ?? "");

  return (
    <div className="flex flex-col lg:flex-row h-full">
      {/* Left sidebar: checklist, title, CTA */}
      <div className="lg:w-[380px] lg:min-w-[320px] overflow-y-auto border-r border-[var(--color-publiora-border)] bg-white">
        <div className="p-4 space-y-5">
          {/* 1. Readiness summary */}
          <section>
            <div className="flex items-center gap-2 mb-3">
              <ClipboardCheck className="h-4 w-4 text-[var(--color-publiora-black)]" />
              <h3 className="text-sm font-semibold text-[var(--color-publiora-black)]">
                Readiness
              </h3>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <SummaryBadge
                label="Blockers"
                count={blockerCount}
                variant="danger"
              />
              <SummaryBadge
                label="Warnings"
                count={warningCount}
                variant="warning"
              />
              <SummaryBadge
                label="Passed"
                count={passCount}
                variant="success"
              />
            </div>
          </section>

          {/* 2. Content checks */}
          <section>
            <h3 className="text-sm font-semibold text-[var(--color-publiora-black)] mb-3">
              Checks
            </h3>
            <ReviewChecklist
              checks={checks}
              onNavigateCheck={onNavigate}
            />
          </section>

          {/* 3. Final title & subtitle */}
          <section>
            <h3 className="text-sm font-semibold text-[var(--color-publiora-black)] mb-3">
              Final Title &amp; Subtitle
            </h3>
            <div className="space-y-2">
              <div>
                <label className="block text-xs font-medium text-[var(--color-deep-gray)] mb-1">
                  Title
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Ebook title"
                  className="h-9 w-full rounded-[var(--radius-input)] border border-[var(--color-publiora-border)] bg-white px-3 text-sm text-[var(--color-deep-gray)] placeholder:text-[var(--color-medium-gray)] focus:border-[var(--color-publiora-blue)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-publiora-blue)] transition-colors"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[var(--color-deep-gray)] mb-1">
                  Subtitle
                </label>
                <input
                  type="text"
                  value={subtitle}
                  onChange={(e) => setSubtitle(e.target.value)}
                  placeholder="Optional subtitle"
                  className="h-9 w-full rounded-[var(--radius-input)] border border-[var(--color-publiora-border)] bg-white px-3 text-sm text-[var(--color-deep-gray)] placeholder:text-[var(--color-medium-gray)] focus:border-[var(--color-publiora-blue)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-publiora-blue)] transition-colors"
                />
              </div>
              {titleDirty && (
                <Button
                  size="sm"
                  variant="primary"
                  onClick={saveTitleAndSubtitle}
                  loading={updateProject.isPending}
                >
                  Save Title
                </Button>
              )}
            </div>

            <div className="mt-3">
              <TitleSuggestions projectId={projectId} />
            </div>
          </section>

          {/* 4. Final CTA */}
          {project && (
            <section>
              <CtaComposer projectId={projectId} project={project} />
            </section>
          )}

          {/* 5. Continue to Publish */}
          {onContinueToPublish && (
            <section className="pt-2">
              <Button
                variant="gold"
                size="md"
                className="w-full"
                disabled={blockerCount > 0}
                onClick={onContinueToPublish}
                title={
                  blockerCount > 0
                    ? `Resolve ${blockerCount} blocker(s) before publishing`
                    : undefined
                }
              >
                <Rocket className="h-4 w-4" />
                {blockerCount > 0
                  ? `Resolve ${blockerCount} Blocker(s)`
                  : "Continue to Publish"}
              </Button>
              {blockerCount > 0 && (
                <p className="text-xs text-[var(--color-danger)] mt-1.5 text-center">
                  You can continue with warnings but must resolve all blockers
                  first.
                </p>
              )}
              {blockerCount === 0 && warningCount > 0 && (
                <p className="text-xs text-[var(--color-gold)] mt-1.5 text-center">
                  You have {warningCount} warning(s). You can still continue to
                  publish.
                </p>
              )}
            </section>
          )}
        </div>
      </div>

      {/* Right: Full preview */}
      <div className="flex-1 min-w-0 overflow-y-auto">
        <PreviewPanel projectId={projectId} />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Summary badge helper
// ---------------------------------------------------------------------------

function SummaryBadge({
  label,
  count,
  variant,
}: {
  label: string;
  count: number;
  variant: "danger" | "warning" | "success";
}) {
  const bg =
    variant === "danger"
      ? "bg-red-50 border-red-200"
      : variant === "warning"
        ? "bg-amber-50 border-amber-200"
        : "bg-green-50 border-green-200";

  const textColor =
    variant === "danger"
      ? "text-red-700"
      : variant === "warning"
        ? "text-amber-700"
        : "text-green-700";

  return (
    <div className={`rounded-lg border px-3 py-2 text-center ${bg}`}>
      <div className={`text-lg font-bold ${textColor}`}>{count}</div>
      <div className={`text-[10px] font-medium uppercase tracking-wide ${textColor}`}>
        {label}
      </div>
    </div>
  );
}
