"use client";

import * as React from "react";
import { AlertTriangle, Check, Info, ArrowRight } from "lucide-react";
import type {
  ProjectWorkflowStep,
  WorkflowCheck,
  WorkflowCheckCategory,
} from "@/types/workflow";
import { reviewId } from "@/lib/i18n/id/review";

interface ReviewChecklistProps {
  checks: WorkflowCheck[];
  onNavigateCheck?: (step: ProjectWorkflowStep, check?: WorkflowCheck) => void;
}

const CATEGORY_ORDER: WorkflowCheckCategory[] = [
  "strategy",
  "structure",
  "content",
  "offer",
  "cta",
  "publication",
];

const CATEGORY_LABEL: Record<WorkflowCheckCategory, string> = {
  strategy: reviewId.strategy,
  structure: reviewId.structure,
  content: reviewId.content,
  offer: reviewId.offerCta,
  cta: reviewId.offerCta,
  publication: reviewId.ready,
};

/**
 * ReviewChecklist renders ALL workflow checks (not only targetStep===review).
 * Groups by category. Blockers/warnings only (pass filtered).
 */
export function ReviewChecklist({
  checks,
  onNavigateCheck,
}: ReviewChecklistProps) {
  const actionable = React.useMemo(
    () => checks.filter((c) => c.severity !== "pass"),
    [checks],
  );

  if (actionable.length === 0) {
    return (
      <div className="flex items-center gap-2 text-sm text-[var(--color-medium-gray)] py-2">
        <Check className="h-4 w-4 text-green-600" />
        <span>{reviewId.noIssues}</span>
      </div>
    );
  }

  const grouped = new Map<string, WorkflowCheck[]>();
  for (const c of actionable) {
    const key = c.category ?? "content";
    const list = grouped.get(key) ?? [];
    list.push(c);
    grouped.set(key, list);
  }

  const keys = [
    ...CATEGORY_ORDER.filter((k) => grouped.has(k)),
    ...[...grouped.keys()].filter(
      (k) => !CATEGORY_ORDER.includes(k as WorkflowCheckCategory),
    ),
  ];

  return (
    <div className="space-y-4">
      {keys.map((key) => {
        const items = grouped.get(key) ?? [];
        const blockers = items.filter((c) => c.severity === "blocker");
        const warnings = items.filter((c) => c.severity === "warning");
        const label =
          CATEGORY_LABEL[key as WorkflowCheckCategory] ?? key;
        return (
          <div key={key} className="space-y-2">
            <h4 className="text-xs font-semibold text-[var(--color-deep-gray)] uppercase tracking-wide">
              {label}
            </h4>
            {blockers.length > 0 && (
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
            )}
            {warnings.length > 0 && (
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
            )}
          </div>
        );
      })}
    </div>
  );
}

function CheckItem({
  check,
  kind,
  onNavigate,
}: {
  check: WorkflowCheck;
  kind: "blocker" | "warning";
  onNavigate?: (step: ProjectWorkflowStep, check?: WorkflowCheck) => void;
}) {
  const iconColor =
    kind === "blocker"
      ? "text-[var(--color-danger)]"
      : "text-[var(--color-gold)]";
  const step = check.action_step ?? check.targetStep;
  const actionLabel =
    check.action_label ??
    (check.section_id || check.outline_section_id
      ? reviewId.openSection
      : step
        ? `Buka ${step}`
        : reviewId.fix);

  return (
    <li className="flex items-start gap-2 text-sm py-1 rounded px-1 -mx-1">
      {kind === "blocker" ? (
        <AlertTriangle className={`h-4 w-4 shrink-0 mt-0.5 ${iconColor}`} />
      ) : (
        <Info className={`h-4 w-4 shrink-0 mt-0.5 ${iconColor}`} />
      )}
      <div className="min-w-0 flex-1 space-y-0.5">
        <span className="text-[var(--color-deep-gray)]">
          {check.title ?? check.label}
        </span>
        {(check.description || check.message) && (
          <span className="block text-xs text-[var(--color-medium-gray)]">
            {check.description ?? check.message}
          </span>
        )}
        {step && onNavigate && (
          <button
            type="button"
            onClick={() => onNavigate(step, check)}
            className="inline-flex items-center gap-1 text-xs font-medium text-[var(--color-publiora-blue)] hover:underline"
          >
            <ArrowRight className="h-3 w-3" />
            {actionLabel}
          </button>
        )}
      </div>
    </li>
  );
}
