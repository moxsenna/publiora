"use client";

import * as React from "react";
import { AlertTriangle, Check, Info, ArrowRight } from "lucide-react";
import type {
  ProjectWorkflowStep,
  WorkflowCheck,
  WorkflowCheckCategory,
} from "@/types/workflow";
import {
  reviewId,
  getReviewCheckCopy,
  getReviewStepActionCopy,
} from "@/lib/i18n/id/review";
import { cn } from "@/lib/utils";

interface SectionMeta {
  id: string;
  title: string;
  outline_section_id?: string;
  position?: number;
}

interface OutlineSectionMeta {
  id: string;
  title: string;
  position: number;
}

interface ReviewChecklistProps {
  checks: WorkflowCheck[];
  sections?: SectionMeta[];
  outlineSections?: OutlineSectionMeta[];
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
  sections,
  outlineSections,
  onNavigateCheck,
}: ReviewChecklistProps) {
  const actionable = React.useMemo(
    () => checks.filter((c) => c.severity !== "pass"),
    [checks],
  );

  if (actionable.length === 0) {
    return (
      <div className="flex items-center gap-2.5 text-sm text-[var(--color-medium-gray)] py-3 px-3.5 bg-emerald-50/60 border border-emerald-200/60 rounded-xl">
        <Check className="h-4 w-4 text-emerald-600 shrink-0" />
        <span className="font-medium text-emerald-900">{reviewId.noIssues}</span>
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
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-[var(--color-deep-gray)] uppercase tracking-wider">
                {label}
              </h4>
              <span className="text-[11px] font-medium text-[var(--color-medium-gray)]">
                {items.length} catatan
              </span>
            </div>
            {blockers.length > 0 && (
              <ul className="space-y-2">
                {blockers.map((c) => (
                  <CheckItem
                    key={c.id}
                    check={c}
                    kind="blocker"
                    sections={sections}
                    outlineSections={outlineSections}
                    onNavigate={onNavigateCheck}
                  />
                ))}
              </ul>
            )}
            {warnings.length > 0 && (
              <ul className="space-y-2">
                {warnings.map((c) => (
                  <CheckItem
                    key={c.id}
                    check={c}
                    kind="warning"
                    sections={sections}
                    outlineSections={outlineSections}
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
  sections,
  outlineSections,
  onNavigate,
}: {
  check: WorkflowCheck;
  kind: "blocker" | "warning";
  sections?: SectionMeta[];
  outlineSections?: OutlineSectionMeta[];
  onNavigate?: (step: ProjectWorkflowStep, check?: WorkflowCheck) => void;
}) {
  const isBlocker = kind === "blocker";
  const step = check.action_step ?? check.targetStep;
  const copy = getReviewCheckCopy(check);

  // Find associated section details if available
  const sec = sections?.find(
    (s) =>
      s.id === check.section_id ||
      (check.outline_section_id && s.outline_section_id === check.outline_section_id),
  );
  const outSec = outlineSections?.find(
    (os) =>
      os.id === check.outline_section_id ||
      (sec?.outline_section_id && os.id === sec.outline_section_id),
  );
  const sectionTitle = sec?.title ?? outSec?.title;
  const sectionPosition = outSec?.position ?? sec?.position;

  const actionLabel =
    check.action_label ??
    (check.section_id || check.outline_section_id
      ? reviewId.openSection
      : step
        ? getReviewStepActionCopy(step)
        : reviewId.fix);

  return (
    <li
      className={cn(
        "rounded-xl border p-3 transition-all",
        isBlocker
          ? "bg-red-50/40 border-red-200/80 shadow-xs"
          : "bg-amber-50/30 border-amber-200/70 shadow-xs",
      )}
    >
      <div className="flex items-start gap-2.5">
        <div
          className={cn(
            "w-6 h-6 rounded-lg flex items-center justify-center shrink-0 mt-0.5",
            isBlocker
              ? "bg-red-100 text-[var(--color-danger)]"
              : "bg-amber-100 text-[var(--color-gold)]",
          )}
        >
          {isBlocker ? (
            <AlertTriangle className="h-3.5 w-3.5" />
          ) : (
            <Info className="h-3.5 w-3.5" />
          )}
        </div>

        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span
              className={cn(
                "text-[11px] font-bold px-1.5 py-0.5 rounded",
                isBlocker
                  ? "bg-red-100 text-red-800"
                  : "bg-amber-100 text-amber-800",
              )}
            >
              {isBlocker ? "Kendala Utama" : "Peringatan"}
            </span>

            {sectionTitle && (
              <span className="text-[11px] font-semibold text-[var(--color-publiora-blue)] bg-blue-50/80 px-1.5 py-0.5 rounded truncate max-w-[200px]">
                {sectionPosition ? `Bab ${sectionPosition}: ` : ""}
                {sectionTitle}
              </span>
            )}
          </div>

          <p className="text-xs sm:text-sm font-semibold text-[var(--color-publiora-black)] leading-snug">
            {copy.title}
          </p>

          {copy.description && (
            <p className="text-xs text-[var(--color-deep-gray)] leading-relaxed">
              {copy.description}
            </p>
          )}

          {step && onNavigate && (
            <div className="pt-1">
              <button
                type="button"
                onClick={() => onNavigate(step, check)}
                className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--color-publiora-blue)] hover:text-blue-800 py-1 px-2.5 rounded-lg bg-white border border-blue-200/80 hover:bg-blue-50/60 shadow-2xs transition-colors active:scale-[0.98]"
              >
                <span>{actionLabel}</span>
                <ArrowRight className="h-3 w-3" />
              </button>
            </div>
          )}
        </div>
      </div>
    </li>
  );
}
