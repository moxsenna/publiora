"use client";

import * as React from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardBody } from "@/components/ui/Card";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { Button } from "@/components/ui/Button";
import { AlertTriangle, ArrowRight, Edit3, FileText, PenTool } from "lucide-react";
import type { StrategyNextAction } from "@/types/strategy";
import {
  STRATEGY_COPY_ID,
  STRATEGY_NEXT_ACTION_LABELS,
  STRATEGY_MISSING_FIELD_SHORT_LABELS,
  readinessScoreLabel,
} from "@/lib/workflow/strategy-copy";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const MAX_VISIBLE_MISSING = 3;

const NEXT_ACTION_ICONS: Record<StrategyNextAction, React.ReactNode> = {
  continue_strategy: <Edit3 className="h-4 w-4" />,
  create_outline: <FileText className="h-4 w-4" />,
  review_outline: <ArrowRight className="h-4 w-4" />,
  start_writing: <PenTool className="h-4 w-4" />,
};

function missingFieldLabel(field: string): string {
  return STRATEGY_MISSING_FIELD_SHORT_LABELS[field] ?? field.replace(/_/g, " ");
}

interface StrategyReadinessCardProps {
  readinessScore: number;
  missingFields: string[];
  nextAction: StrategyNextAction;
  /** Called when user clicks the primary CTA (Buat/Buka struktur ebook). */
  onRequestOutline?: () => void;
}

export function StrategyReadinessCard({
  readinessScore,
  missingFields,
  nextAction,
  onRequestOutline,
}: StrategyReadinessCardProps) {
  const score = Math.max(0, Math.min(100, readinessScore));
  const label = STRATEGY_NEXT_ACTION_LABELS[nextAction] ?? nextAction;
  const icon = NEXT_ACTION_ICONS[nextAction] ?? null;

  // Determine primary CTA
  const nMissing = missingFields.length;
  const canCreateOutline = nextAction !== "continue_strategy";

  // Whether outline already exists (review_outline or later)
  const outlineExists =
    nextAction === "review_outline" || nextAction === "start_writing";

  // Missing list with max 3 + overflow
  const visibleMissing = missingFields.slice(0, MAX_VISIBLE_MISSING);
  const overflowCount = missingFields.length - MAX_VISIBLE_MISSING;

  return (
    <Card>
      <CardHeader>
        <CardTitle>{STRATEGY_COPY_ID.readinessTitle}</CardTitle>
        <CardDescription>
          {STRATEGY_COPY_ID.readinessDescription}
        </CardDescription>
      </CardHeader>

      <CardBody className="space-y-4">
        {/* Score + progress bar */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-2xl font-bold text-[var(--color-publiora-black)]">
              {score}%
            </span>
            <span className="text-xs text-[var(--color-medium-gray)]">
              {readinessScoreLabel(score)}
            </span>
          </div>
          <ProgressBar
            value={score}
            size="md"
            barClassName={
              score >= 70
                ? "bg-[var(--color-success)]"
                : score >= 40
                  ? "bg-[var(--color-gold)]"
                  : "bg-[var(--color-gold)]"
            }
          />
        </div>

        {/* Next action */}
        <div className="flex items-center gap-2 text-sm text-[var(--color-deep-gray)] bg-[var(--color-surface-2)] rounded-lg px-3 py-2">
          {icon}
          <span className="font-medium">{label}</span>
        </div>

        {/* Missing fields */}
        {missingFields.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-xs font-semibold text-[var(--color-publiora-black)] uppercase tracking-wide flex items-center gap-1.5">
              <AlertTriangle className="h-3.5 w-3.5 text-[var(--color-gold)]" />
              {STRATEGY_COPY_ID.missingSectionTitle}
            </h4>
            <ul className="space-y-1.5">
              {visibleMissing.map((field) => (
                <li
                  key={field}
                  className="flex items-start gap-2 text-sm text-[var(--color-deep-gray)]"
                >
                  <span className="inline-block mt-0.5 h-1.5 w-1.5 rounded-full bg-[var(--color-gold)] shrink-0" />
                  <span className="break-words">{missingFieldLabel(field)}</span>
                </li>
              ))}
              {overflowCount > 0 && (
                <li className="flex items-start gap-2 text-sm text-[var(--color-medium-gray)] italic">
                  <span className="inline-block mt-0.5 h-1.5 w-1.5 rounded-full bg-[var(--color-medium-gray)] shrink-0" />
                  <span>+{overflowCount} lainnya</span>
                </li>
              )}
            </ul>
          </div>
        )}

        {missingFields.length === 0 && (
          <div className="text-xs text-[var(--color-success)] flex items-center gap-1.5">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-[var(--color-success)]" />
            {STRATEGY_COPY_ID.allComplete}
          </div>
        )}

        {/* Primary CTA */}
        {!canCreateOutline && nMissing > 0 && (
          <p className="text-xs text-[var(--color-medium-gray)] text-center">
            {STRATEGY_COPY_ID.footerIncomplete(nMissing)}
          </p>
        )}

        {canCreateOutline && !outlineExists && (
          <Button
            onClick={onRequestOutline}
            disabled={!onRequestOutline}
            className="w-full"
          >
            <FileText className="h-4 w-4 mr-1.5" />
            {STRATEGY_COPY_ID.createOutline}
          </Button>
        )}

        {canCreateOutline && outlineExists && (
          <Button
            variant="outline"
            onClick={onRequestOutline}
            className="w-full"
          >
            <ArrowRight className="h-4 w-4 mr-1.5" />
            {STRATEGY_COPY_ID.openOutline}
          </Button>
        )}
      </CardBody>
    </Card>
  );
}
