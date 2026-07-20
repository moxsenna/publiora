"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import type { ProjectWorkflowStep, WorkflowStepStatus } from "@/types/workflow";
import { Check, Lock, AlertTriangle, ChevronDown } from "lucide-react";

const STEP_LABELS: Record<ProjectWorkflowStep, string> = {
  strategy: "Strategi",
  outline: "Struktur",
  write: "Tulis",
  review: "Tinjau",
  publish: "Terbitkan",
};

const STEP_ORDER: ProjectWorkflowStep[] = [
  "strategy",
  "outline",
  "write",
  "review",
  "publish",
];

interface WorkspaceStepNavProps {
  current: ProjectWorkflowStep;
  steps: Record<ProjectWorkflowStep, WorkflowStepStatus>;
  onNavigate: (step: ProjectWorkflowStep) => void;
}

export function WorkspaceStepNav({
  current,
  steps,
  onNavigate,
}: WorkspaceStepNavProps) {
  // ---- Desktop: horizontal step bar ----
  const desktopBar = (
    <nav
      aria-label="Workflow stages"
      className="hidden sm:flex items-center gap-0.5 p-0.5 rounded-[var(--radius-button)] bg-[var(--color-surface-2)] border border-[var(--color-publiora-border)]"
    >
      {STEP_ORDER.map((step, i) => {
        const status = steps[step] ?? "available";
        const isActive = step === current;
        // All steps clickable — blocked still navigable; page shows blocker overlay

        return (
          <button
            key={step}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onNavigate(step)}
            className={cn(
              "flex items-center gap-1.5 px-2.5 h-8 rounded-md text-xs font-medium transition-colors whitespace-nowrap",
              isActive
                ? "bg-white text-[var(--color-publiora-black)] shadow-sm"
                : "text-[var(--color-medium-gray)] hover:text-[var(--color-deep-gray)]",
              status === "blocked" && !isActive && "opacity-70"
            )}
          >
            <StepIcon status={status} />
            <span>{STEP_LABELS[step]}</span>
            {/* Connector arrow between steps */}
            {i < STEP_ORDER.length - 1 && (
              <span className="text-[var(--color-medium-gray)]/40 ml-0.5" aria-hidden="true">
                &#8250;
              </span>
            )}
          </button>
        );
      })}
    </nav>
  );

  // ---- Mobile: compact step selector ----
  const [open, setOpen] = React.useState(false);
  const currentLabel = STEP_LABELS[current];
  const currentIndex = STEP_ORDER.indexOf(current) + 1;

  const mobileBar = (
    <div className="sm:hidden relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "w-full flex items-center justify-between gap-2 rounded-lg border border-[var(--color-publiora-border)] bg-[var(--color-surface-2)] px-2.5 py-1.5 text-left"
        )}
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-label="Workflow stage selector"
      >
        <span className="text-sm font-medium text-[var(--color-publiora-black)]">
          <span className="text-[var(--color-medium-gray)]">
            Tahap {currentIndex} dari {STEP_ORDER.length}:
          </span>{" "}
          {currentLabel}
        </span>
        <ChevronDown
          className={cn(
            "h-4 w-4 shrink-0 text-[var(--color-medium-gray)] transition-transform",
            open && "rotate-180"
          )}
        />
      </button>
      {open && (
        <ul
          role="listbox"
          aria-label="Workflow stages"
          className="absolute top-full left-0 right-0 mt-1 z-30 border border-[var(--color-publiora-border)] bg-white rounded-lg shadow-lg overflow-hidden"
        >
          {STEP_ORDER.map((step) => {
            const status = steps[step] ?? "available";
            const isActive = step === current;

            return (
              <li key={step}>
                <button
                  type="button"
                  role="option"
                  aria-selected={isActive}
                  onClick={() => {
                    onNavigate(step);
                    setOpen(false);
                  }}
                  className={cn(
                    "w-full flex items-center gap-2 px-3 py-2 text-left text-sm transition-colors hover:bg-[var(--color-surface-2)]",
                    isActive
                      ? "bg-[var(--color-surface-2)] font-semibold text-[var(--color-publiora-black)]"
                      : "text-[var(--color-deep-gray)]",
                    status === "blocked" && !isActive && "opacity-70"
                  )}
                >
                  <StepIcon status={status} />
                  {STEP_LABELS[step]}
                  {isActive && (
                    <span className="ml-auto text-xs text-[var(--color-medium-gray)]">
                      aktif
                    </span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      )}
      {/* Backdrop to close on outside click */}
      {open && (
        <div
          className="fixed inset-0 z-20"
          onClick={() => setOpen(false)}
          aria-hidden="true"
        />
      )}
    </div>
  );

  return (
    <div className="overflow-x-auto no-scrollbar -mx-1 px-1 py-1.5">
      {desktopBar}
      {mobileBar}
    </div>
  );
}

/** Lightweight icon for each workflow step status. */
function StepIcon({ status }: { status: WorkflowStepStatus }) {
  switch (status) {
    case "complete":
      return (
        <Check className="h-3 w-3 text-[var(--color-success)]" aria-hidden="true" />
      );
    case "blocked":
      return (
        <Lock className="h-3 w-3 text-[var(--color-medium-gray)]" aria-hidden="true" />
      );
    case "needs_attention":
      return (
        <AlertTriangle
          className="h-3 w-3 text-[var(--color-gold)]"
          aria-hidden="true"
        />
      );
    default:
      return null;
  }
}
