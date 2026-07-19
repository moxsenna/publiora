"use client";

import * as React from "react";
import Link from "next/link";
import { useParams, useRouter, useSearchParams, usePathname } from "next/navigation";
import {
  useProject,
  useStrategy,
  useOutline,
  useSections,
  useDeleteProject,
} from "@/lib/api/hooks";
import { useUiStore } from "@/store/projectStore";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { Modal } from "@/components/ui/Modal";
import { WorkspaceHeader } from "@/components/workspace/WorkspaceHeader";
import { WorkspaceStepNav } from "@/components/workspace/WorkspaceStepNav";
import { WorkspaceStageFooter } from "@/components/workspace/WorkspaceStageFooter";
import { StrategyPanel } from "@/components/workspace/StrategyPanel";
import { OutlinePanel } from "@/components/workspace/OutlinePanel";
import { SectionsPanel } from "@/components/workspace/SectionsPanel";
import { ReviewPanel } from "@/components/workspace/ReviewPanel";
import { PublishDialog } from "@/components/workspace/PublishDialog";
import { PublishPanel } from "@/components/workspace/PublishPanel";
import { deriveProjectWorkflow, parseWorkflowStep } from "@/lib/workflow/project-workflow";
import {
  ArrowLeft,
  Trash2,
  AlertTriangle,
  Lock,
} from "lucide-react";
import type {
  ProjectWorkflowStep,
  WorkflowStepStatus,
  ProjectWorkflowState,
} from "@/types/workflow";

const STEP_ORDER: ProjectWorkflowStep[] = [
  "strategy",
  "outline",
  "write",
  "review",
  "publish",
];

const DEFAULT_STEPS: Record<ProjectWorkflowStep, WorkflowStepStatus> = {
  strategy: "current",
  outline: "blocked",
  write: "blocked",
  review: "blocked",
  publish: "blocked",
};

export default function WorkspacePage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // ---- Data hooks ----
  const { data: project, isLoading: projectLoading, isError } = useProject(id);
  const { data: strategy, isLoading: strategyLoading } = useStrategy(id);
  const { data: outline } = useOutline(id);
  const { data: sections } = useSections(id);

  const pushToast = useUiStore((s) => s.pushToast);
  const del = useDeleteProject();

  // ---- Dialog state ----
  const [publishOpen, setPublishOpen] = React.useState(false);
  const [deleteOpen, setDeleteOpen] = React.useState(false);

  // ---- Derive workflow state ----
  const workflow = React.useMemo(() => {
    if (!project || !strategy) return null;
    return deriveProjectWorkflow({
      project,
      strategyState: strategy.state,
      readinessScore: strategy.readiness_score,
      outline: outline ?? null,
      sections: sections ?? [],
    });
  }, [project, strategy, outline, sections]);

  // ---- URL-driven step ----
  const paramStep = searchParams.get("step");
  const recommendedStep = workflow?.recommendedStep ?? "strategy";
  const currentStep = React.useMemo(
    () => parseWorkflowStep(paramStep, recommendedStep),
    [paramStep, recommendedStep],
  );

  // User navigation: push so browser back/forward works
  const pushStep = React.useCallback(
    (step: ProjectWorkflowStep) => {
      const nextParams = new URLSearchParams(searchParams.toString());
      nextParams.set("step", step);
      router.push(`${pathname}?${nextParams.toString()}`, { scroll: false });
    },
    [router, pathname, searchParams],
  );

  // Silent correction only: invalid ?step= → recommended (no history pollution)
  const replaceStep = React.useCallback(
    (step: ProjectWorkflowStep) => {
      const nextParams = new URLSearchParams(searchParams.toString());
      nextParams.set("step", step);
      router.replace(`${pathname}?${nextParams.toString()}`, { scroll: false });
    },
    [router, pathname, searchParams],
  );

  // If ?step= was invalid, redirect to the fallback (recommended step)
  React.useEffect(() => {
    if (!workflow) return;
    if (paramStep && paramStep !== currentStep) {
      replaceStep(currentStep);
    }
  }, [paramStep, currentStep, workflow, replaceStep]);

  // ---- Keyboard shortcuts 1-5 -> workflow steps ----
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      const tag = el?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || el?.isContentEditable) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const n = Number(e.key);
      if (n >= 1 && n <= 5) {
        e.preventDefault();
        pushStep(STEP_ORDER[n - 1]);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [pushStep]);

  // ---- Actions ----
  const onDelete = async () => {
    try {
      await del.mutateAsync(id);
      pushToast({ title: "Project dihapus", variant: "default" });
      router.replace("/projects");
    } catch {
      pushToast({ title: "Gagal hapus project", variant: "danger" });
    }
  };

  const onPreview = () => {
    pushStep("review");
  };

  // ---- Error state ----
  if (isError) {
    return (
      <div className="flex-1 grid place-items-center p-8">
        <div className="text-center space-y-3">
          <h1 className="text-xl font-semibold text-[var(--color-publiora-black)]">
            Project tidak ditemukan
          </h1>
          <p className="text-sm text-[var(--color-medium-gray)]">
            ID tidak valid atau sudah dihapus.
          </p>
          <Link href="/projects">
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4" />
              Kembali ke projects
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  // ---- Loading skeleton ----
  if (projectLoading || strategyLoading) {
    return (
      <div className="flex flex-col flex-1 min-h-0 h-[calc(100vh-3rem)]">
        <div className="border-b border-[var(--color-publiora-border)] bg-white px-2.5 sm:px-3 py-2 flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Skeleton className="h-8 w-8 rounded-md" />
            <Skeleton className="h-4 w-40" />
          </div>
          <Skeleton className="h-8 w-20 rounded-md" />
        </div>
        <div className="flex-1 p-6 space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-16" />
          ))}
        </div>
      </div>
    );
  }

  // Footer next CTA: advance when current stage complete or review without blockers
  const canAct = workflow
    ? currentStep === "review"
      ? workflow.canPublish ||
        !workflow.checks.some((c) => c.severity === "blocker")
      : workflow.steps[currentStep] === "complete"
    : false;

  return (
    <div className="flex flex-col flex-1 min-h-0 h-[calc(100vh-3rem)]">
      {/* Header */}
      <WorkspaceHeader
        project={project}
        isLoading={projectLoading}
        onPreview={onPreview}
        onDelete={() => setDeleteOpen(true)}
      />

      {/* Step Navigation */}
      <div className="border-b border-[var(--color-publiora-border)] bg-white px-2.5 sm:px-3">
        <WorkspaceStepNav
          current={currentStep}
          steps={workflow?.steps ?? DEFAULT_STEPS}
          onNavigate={pushStep}
        />
      </div>

      {/* Stage Content */}
      <div className="flex-1 min-h-0 overflow-hidden">
        <StageContent
          step={currentStep}
          projectId={id}
          workflow={workflow}
          project={project}
          sections={sections}
          onNavigate={pushStep}
          onContinueToPublish={() => setPublishOpen(true)}
        />
      </div>

      {/* Footer */}
      {workflow && (
        <WorkspaceStageFooter
          current={currentStep}
          workflow={workflow}
          canAct={canAct}
          onNavigate={pushStep}
          onPublish={() => setPublishOpen(true)}
        />
      )}

      {/* Dialogs */}
      {project && (
        <PublishDialog
          open={publishOpen}
          onClose={() => setPublishOpen(false)}
          projectId={project.id}
        />
      )}

      <Modal
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        title="Hapus project?"
        description={`"${project?.title ?? "Project"}" akan dihapus permanen. Outline, sections, dan chat ikut hilang.`}
        size="sm"
        footer={
          <>
            <Button variant="outline" onClick={() => setDeleteOpen(false)}>
              Batal
            </Button>
            <Button variant="danger" loading={del.isPending} onClick={onDelete}>
              <Trash2 className="h-4 w-4" />
              Hapus
            </Button>
          </>
        }
      >
        <p className="text-sm text-[var(--color-medium-gray)]">
          Aksi ini tidak bisa di-undo.
        </p>
      </Modal>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Stage content mapping
// ---------------------------------------------------------------------------

function StageContent({
  step,
  projectId,
  workflow,
  project,
  sections,
  onNavigate,
  onContinueToPublish,
}: {
  step: ProjectWorkflowStep;
  projectId: string;
  workflow: ProjectWorkflowState | null;
  project: import("@/types").Project | undefined;
  sections: import("@/types").Section[] | undefined;
  onNavigate: (step: ProjectWorkflowStep) => void;
  onContinueToPublish: () => void;
}) {
  const stepStatus = workflow?.steps[step];
  const allBlockers = workflow?.blockers ?? [];

  // When stage blocked, show all blockers (earlier incomplete stages cause later blocks).
  // Otherwise show blockers that target this step. Never render empty overlay.
  const displayBlockers =
    stepStatus === "blocked"
      ? allBlockers
      : allBlockers.filter((b) => b.targetStep === step);

  const showBlocked = stepStatus === "blocked" && displayBlockers.length > 0;

  return (
    <div className="relative h-full">
      {/* Blocked overlay */}
      {showBlocked && (
        <div className="absolute inset-0 z-10 bg-white/85 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center">
          <div className="max-w-md space-y-3">
            <Lock className="h-8 w-8 mx-auto text-[var(--color-medium-gray)]" />
            <h3 className="text-base font-semibold text-[var(--color-publiora-black)]">
              This stage is not available yet
            </h3>
            <ul className="space-y-2 text-left">
              {displayBlockers.map((b) => (
                <li
                  key={b.code}
                  className="flex items-start gap-2 text-sm text-[var(--color-deep-gray)]"
                >
                  <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5 text-[var(--color-gold)]" />
                  <div className="min-w-0 flex-1 space-y-1">
                    <span>{b.message}</span>
                    {b.targetStep !== step && (
                      <button
                        type="button"
                        onClick={() => onNavigate(b.targetStep)}
                        className="block text-xs font-medium text-[var(--color-publiora-blue)] hover:underline"
                      >
                        Go to {b.targetStep}
                      </button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
            <p className="text-xs text-[var(--color-medium-gray)]">
              Complete the previous stages to unlock this one.
            </p>
          </div>
        </div>
      )}

      {/* Actual panel content */}
      {step === "strategy" && <StrategyPanel projectId={projectId} />}
      {step === "outline" && (
        <div className="h-full overflow-y-auto">
          <OutlinePanel
            projectId={projectId}
            onContinueToWrite={() => onNavigate("write")}
          />
        </div>
      )}
      {step === "write" && <SectionsPanel projectId={projectId} />}
      {step === "review" && (
        <div className="h-full overflow-hidden">
          <ReviewPanel
            projectId={projectId}
            workflow={workflow}
            onNavigate={onNavigate}
            onContinueToPublish={onContinueToPublish}
          />
        </div>
      )}
      {step === "publish" && (
        <div className="h-full overflow-y-auto">
          <PublishStage
            projectId={projectId}
            workflow={workflow}
            project={project}
            sections={sections}
            onNavigate={onNavigate}
            onContinueToPublish={onContinueToPublish}
          />
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Publish stage: comprehensive panel using PublishPanel
// ---------------------------------------------------------------------------

function PublishStage({
  projectId,
  workflow,
  project,
  sections,
  onNavigate,
  onContinueToPublish,
}: {
  projectId: string;
  workflow: ProjectWorkflowState | null;
  project: import("@/types").Project | undefined;
  sections: import("@/types").Section[] | undefined;
  onNavigate: (step: ProjectWorkflowStep) => void;
  onContinueToPublish: () => void;
}) {
  const isPublished = project?.status === "published";
  const completedSections = (sections ?? []).filter(
    (s) => s.status === "generated" || s.status === "edited",
  );

  const handleNavigate = React.useCallback(
    (step: string) => onNavigate(step as ProjectWorkflowStep),
    [onNavigate],
  );

  return (
    <PublishPanel
      projectId={projectId}
      workflow={workflow}
      projectTitle={project?.title ?? null}
      projectSubtitle={project?.subtitle ?? null}
      projectAuthor={project?.author ?? null}
      sectionsCount={completedSections.length}
      hasCta={!!(project?.cta_goal || project?.final_cta)}
      ctaGoal={project?.cta_goal ?? null}
      ctaText={project?.final_cta ?? null}
      ctaUrl={project?.cta_url ?? null}
      publishedSlug={null}
      publishedId={null}
      isPublished={isPublished}
      onNavigate={handleNavigate}
    />
  );
}
