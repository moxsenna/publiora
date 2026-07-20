"use client";

import * as React from "react";
import { X } from "lucide-react";
import { StrategyBriefCard } from "@/components/workspace/StrategyBriefCard";
import { StrategyReadinessCard } from "@/components/workspace/StrategyReadinessCard";
import type { EbookStrategy, StrategyNextAction } from "@/types/strategy";
import type { EbookType } from "@/types/project";

// ---------------------------------------------------------------------------
// StrategyBriefSheet
//
// An accessible overlay sheet for Brief + Readiness on tablet and mobile.
//
// - Mobile (< md): bottom sheet (slides from bottom, rounded top corners)
// - Tablet (md – lg): right drawer (slides from right, full height)
// - Desktop (>= lg): NOT used – permanent right rail is rendered by
//   StrategyPanel instead.
//
// Accessibility:
// - backdrop click closes
// - Escape closes
// - focus trap (Tab cycling within panel)
// - body scroll lock while open
// - restore focus on close
// ---------------------------------------------------------------------------

interface StrategyBriefSheetProps {
  open: boolean;
  onClose: () => void;
  strategy: EbookStrategy;
  ebookType?: EbookType | null;
  readinessScore: number;
  missingFields: string[];
  nextAction: StrategyNextAction;
  onEdit: () => void;
  onEditField: (key: keyof EbookStrategy) => void;
  onRequestOutline?: () => void;
}

export function StrategyBriefSheet({
  open,
  onClose,
  strategy,
  ebookType,
  readinessScore,
  missingFields,
  nextAction,
  onEdit,
  onEditField,
  onRequestOutline,
}: StrategyBriefSheetProps) {
  const panelRef = React.useRef<HTMLDivElement>(null);
  const previousFocusRef = React.useRef<HTMLElement | null>(null);

  React.useEffect(() => {
    if (!open) return;

    previousFocusRef.current = document.activeElement as HTMLElement | null;
    const panel = panelRef.current;

    const focusableSelector =
      'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])';

    const focusFirst = () => {
      const nodes = panel?.querySelectorAll<HTMLElement>(focusableSelector);
      (nodes?.[0] ?? panel)?.focus();
    };
    const t = window.setTimeout(focusFirst, 0);

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
        return;
      }
      if (e.key !== "Tab" || !panel) return;
      const nodes = Array.from(
        panel.querySelectorAll<HTMLElement>(focusableSelector),
      ).filter((el) => !el.hasAttribute("disabled") && el.tabIndex !== -1);
      if (nodes.length === 0) {
        e.preventDefault();
        panel.focus();
        return;
      }
      const first = nodes[0];
      const last = nodes[nodes.length - 1];
      const active = document.activeElement as HTMLElement | null;
      if (e.shiftKey && (active === first || !panel.contains(active))) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      window.clearTimeout(t);
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
      previousFocusRef.current?.focus?.();
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Panel */}
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label="Brief & Kesiapan Strategi"
        tabIndex={-1}
        className={[
          // Base: bottom sheet (mobile)
          "absolute inset-x-0 bottom-0 max-h-[90vh] rounded-t-2xl",
          // Tablet+: right drawer
          "md:inset-y-0 md:left-auto md:right-0 md:w-[360px] md:max-h-none md:rounded-none",
          // Shared styling
          "bg-white shadow-xl flex flex-col",
          "animate-slide-up md:animate-slide-left",
          "outline-none",
        ].join(" ")}
      >
        {/* Header */}
        <div className="flex items-center justify-between shrink-0 px-4 py-3 border-b border-[var(--color-publiora-border)]">
          <h2 className="text-base font-semibold text-[var(--color-publiora-black)]">
            Brief & Kesiapan
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="text-[var(--color-medium-gray)] hover:text-[var(--color-publiora-black)] rounded-md p-1.5 min-h-9 min-w-9 grid place-items-center"
            aria-label="Tutup"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto overscroll-contain p-3 space-y-3">
          <StrategyBriefCard
            strategy={strategy}
            ebookType={ebookType}
            onEdit={onEdit}
            onEditField={onEditField}
          />
          <StrategyReadinessCard
            readinessScore={readinessScore}
            missingFields={missingFields}
            nextAction={nextAction}
            onRequestOutline={onRequestOutline}
          />
        </div>
      </div>
    </div>
  );
}
