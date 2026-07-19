"use client";

import * as React from "react";
import { AlertTriangle, Check, Info, ArrowRight } from "lucide-react";
import type { WorkflowCheck, ProjectWorkflowStep } from "@/types/workflow";

interface ReviewChecklistProps {
  checks: WorkflowCheck[];
  onNavigateCheck?: (step: ProjectWorkflowStep) => void;
}

/**
 * ReviewChecklist renders ALL workflow checks (not only targetStep===review).
 * Blockers are distinguished from warnings. Each checker references its
 * relevant stage/section so users can navigate to the source.
 *
 * The severity "pass" entries are filtered out — only warnings and blockers
 * are actionable in the review panel.
 */
export function ReviewChecklist({ checks, onNavigateCheck }: ReviewChecklistProps) {
  const actionable = React.useMemo(
    () => checks.filter((c) => c.severity !== "pass"),
    [checks],
  );

  if (actionable.length === 0) {
    return (
      <div className="flex items-center gap-2 text-sm text-[var(--color-medium-gray)] py-2">
        <Check className="h-4 w-4 text-green-600" />
        <span>All checks passed — no issues found.</span>
      </div>
    );
  }

  const blockers = actionable.filter((c) => c.severity === "blocker");
  const warnings = actionable.filter((c) => c.severity === "warning");

  return (
    <div className="space-y-3">
      {/* Blockers */}
      {blockers.length > 0 && (
        <div className="space-y-1.5">
          <h4 className="text-xs font-semibold text-[var(--color-danger)] uppercase tracking-wide flex items-center gap-1">
            <AlertTriangle className="h-3.5 w-3.5" />
            Blockers ({blockers.length})
          </h4>
          <ul className="space-y-1">
            {blockers.map((c) => (
              <CheckItem
                key={c.id}
                check={c}
                kind="blocker"
                onNavigate={onNavigateCheck}
              />
            ))}
          </ul>
        </div>
      )}

      {/* Warnings */}
      {warnings.length > 0 && (
        <div className="space-y-1.5">
          <h4 className="text-xs font-semibold text-[var(--color-gold)] uppercase tracking-wide flex items-center gap-1">
            <Info className="h-3.5 w-3.5" />
            Warnings ({warnings.length})
          </h4>
          <ul className="space-y-1">
            {warnings.map((c) => (
              <CheckItem
                key={c.id}
                check={c}
                kind="warning"
                onNavigate={onNavigateCheck}
              />
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Individual check item
// ---------------------------------------------------------------------------

function CheckItem({
  check,
  kind,
  onNavigate,
}: {
  check: WorkflowCheck;
  kind: "blocker" | "warning";
  onNavigate?: (step: ProjectWorkflowStep) => void;
}) {
  const iconColor =
    kind === "blocker"
      ? "text-[var(--color-danger)]"
      : "text-[var(--color-gold)]";

  return (
    <li className="flex items-start gap-2 text-sm py-1 rounded px-1 -mx-1">
      {kind === "blocker" ? (
        <AlertTriangle className={`h-4 w-4 shrink-0 mt-0.5 ${iconColor}`} />
      ) : (
        <Info className={`h-4 w-4 shrink-0 mt-0.5 ${iconColor}`} />
      )}
      <div className="min-w-0 flex-1 space-y-0.5">
        <span className="text-[var(--color-deep-gray)]">{check.label}</span>
        {check.message && (
          <span className="block text-xs text-[var(--color-medium-gray)]">
            {check.message}
          </span>
        )}
        {check.targetStep && onNavigate && (
          <button
            type="button"
            onClick={() => onNavigate(check.targetStep!)}
            className="inline-flex items-center gap-1 text-xs font-medium text-[var(--color-publiora-blue)] hover:underline"
          >
            <ArrowRight className="h-3 w-3" />
            Go to {check.targetStep}
          </button>
        )}
      </div>
    </li>
  );
}
