"use client";

import * as React from "react";
import { Button } from "@/components/ui/Button";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { AlertTriangle, Rocket, ArrowRight } from "lucide-react";
import type { ProjectWorkflowStep, ProjectWorkflowState } from "@/types/workflow";
import { getWorkflowBlockerCopy, workspaceId } from "@/lib/i18n/id/workspace";

const STEP_ORDER: ProjectWorkflowStep[] = [
  "strategy",
  "outline",
  "write",
  "review",
  "publish",
];

interface WorkspaceStageFooterProps {
  current: ProjectWorkflowStep;
  workflow: ProjectWorkflowState;
  canAct: boolean;
  onNavigate: (step: ProjectWorkflowStep) => void;
  onPublish: () => void;
}

export function WorkspaceStageFooter({
  current,
  workflow,
  canAct,
  onNavigate,
  onPublish,
}: WorkspaceStageFooterProps) {
  const { steps, blockers, writingProgress, totalSectionCount, canPublish } =
    workflow;

  // Top blocker for the current step
  const currentBlockers = blockers.filter((b) => b.targetStep === current);

  // Determine recommended primary CTA
  const primaryCta = getPrimaryCta(current, canAct, canPublish, onNavigate, onPublish);

  return (
    <footer className="border-t border-[var(--color-publiora-border)] bg-white px-3 py-2.5">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        {/* Left: progress / blocker info */}
        <div className="flex items-center gap-2 min-w-0 flex-1">
          {/* Progress bar for write stage */}
          {current === "write" && totalSectionCount > 0 && (
            <div className="hidden sm:flex items-center gap-2 min-w-[120px] max-w-[200px]">
              <ProgressBar
                value={writingProgress}
                aria-label={`Progres penulisan: ${writingProgress}%`}
                barClassName="bg-[var(--color-publiora-blue)]"
              />
              <span className="text-xs text-[var(--color-medium-gray)] whitespace-nowrap">
                {writingProgress}%
              </span>
            </div>
          )}

          {/* Blocker message */}
          {currentBlockers.length > 0 && (
            <div className="flex items-center gap-1.5 text-xs text-[var(--color-gold)] min-w-0">
              <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">{getWorkflowBlockerCopy(currentBlockers[0].code).description}</span>
            </div>
          )}
        </div>

        {/* Right: primary CTA */}
        <div className="flex items-center gap-2 shrink-0">
          {primaryCta}
        </div>
      </div>
    </footer>
  );
}

// ---------------------------------------------------------------------------
// Primary CTA logic
// ---------------------------------------------------------------------------

interface CtaDescriptor {
  label: string;
  disabled: boolean;
  disabledReason?: string;
  action: () => void;
  icon?: React.ReactNode;
  variant?: "primary" | "gold" | "outline";
}

function getPrimaryCta(
  current: ProjectWorkflowStep,
  canAct: boolean,
  canPublish: boolean,
  onNavigate: (step: ProjectWorkflowStep) => void,
  onPublish: () => void,
): React.ReactNode {
  let cta: CtaDescriptor;

  switch (current) {
    case "strategy":
      cta = {
        label: workspaceId.generateOutline,
        disabled: !canAct,
        disabledReason: "Lengkapi strategi terlebih dahulu",
        action: () => onNavigate("outline"),
        icon: <ArrowRight className="h-3.5 w-3.5" />,
        variant: "primary",
      };
      break;

    case "outline":
      cta = {
        label: workspaceId.writeSections,
        disabled: !canAct,
        disabledReason: "Setujui outline terlebih dahulu",
        action: () => onNavigate("write"),
        icon: <ArrowRight className="h-3.5 w-3.5" />,
        variant: "primary",
      };
      break;

    case "write":
      cta = {
        label: workspaceId.reviewEbook,
        disabled: !canAct,
        disabledReason: "Selesaikan semua bagian terlebih dahulu",
        action: () => onNavigate("review"),
        icon: <ArrowRight className="h-3.5 w-3.5" />,
        variant: "primary",
      };
      break;

    case "review":
      if (canPublish) {
        cta = {
          label: "Terbitkan",
          disabled: false,
          action: onPublish,
          icon: <Rocket className="h-3.5 w-3.5" />,
          variant: "gold",
        };
      } else {
        cta = {
          label: "Tinjau masalah",
          disabled: true,
          disabledReason: "Selesaikan masalah sebelum menerbitkan",
          action: () => {},
          icon: <AlertTriangle className="h-3.5 w-3.5" />,
          variant: "outline",
        };
      }
      break;

    case "publish":
      cta = {
        label: "Terbitkan",
        disabled: !canPublish,
        disabledReason: "Selesaikan semua masalah sebelum menerbitkan",
        action: onPublish,
        icon: <Rocket className="h-3.5 w-3.5" />,
        variant: "gold",
      };
      break;

    default:
      cta = {
        label: "Lanjut",
        disabled: true,
        action: () => {},
      };
  }

  return (
    <Button
      size="sm"
      variant={cta.variant ?? "primary"}
      disabled={cta.disabled}
      onClick={cta.action}
      title={cta.disabled ? cta.disabledReason : undefined}
      aria-label={cta.disabled ? cta.disabledReason : cta.label}
    >
      {cta.icon}
      <span className="hidden sm:inline">{cta.label}</span>
      <span className="sm:hidden">
        {current === "publish" || current === "review" ? "Terbitkan" : "Lanjut"}
      </span>
    </Button>
  );
}
