"use client";

import * as React from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardBody } from "@/components/ui/Card";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { AlertTriangle, ArrowRight, Edit3, FileText, PenTool } from "lucide-react";
import type { StrategyNextAction } from "@/types/strategy";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const READINESS_LABELS: Record<string, string> = {
  continue_strategy: "Continue building strategy",
  create_outline: "Create outline",
  review_outline: "Review outline",
  start_writing: "Start writing sections",
};

const FIELD_PLAIN_LANGUAGE: Record<string, string> = {
  topic: "What is the main topic of your ebook?",
  audience: "Who is the target audience?",
  primary_problem: "What primary problem does the ebook solve?",
  desired_outcome: "What outcome do readers achieve?",
  core_promise: "What is the core promise or value proposition?",
  unique_angle: "What makes this ebook unique or different?",
  pain_points: "What specific pain points does the audience have?",
  content_pillars: "What are the key content pillars or themes?",
  product_or_offer: "What product or offer are you promoting?",
  funnel_goal: "What is the funnel goal of this ebook?",
  cta_goal: "What is the desired CTA action?",
  tone: "What writing tone should the ebook use?",
  audience_sophistication: "What is the audience sophistication level?",
};

const NEXT_ACTION_ICONS: Record<StrategyNextAction, React.ReactNode> = {
  continue_strategy: <Edit3 className="h-4 w-4" />,
  create_outline: <FileText className="h-4 w-4" />,
  review_outline: <ArrowRight className="h-4 w-4" />,
  start_writing: <PenTool className="h-4 w-4" />,
};

function readinessText(score: number): string {
  if (score >= 90) return "Excellent — ready for outline";
  if (score >= 70) return "Good — meets minimum threshold";
  if (score >= 40) return "Needs more detail";
  return "Just getting started";
}

interface StrategyReadinessCardProps {
  readinessScore: number;
  missingFields: string[];
  nextAction: StrategyNextAction;
}

export function StrategyReadinessCard({
  readinessScore,
  missingFields,
  nextAction,
}: StrategyReadinessCardProps) {
  const score = Math.max(0, Math.min(100, readinessScore));
  const label = READINESS_LABELS[nextAction] ?? nextAction;
  const icon = NEXT_ACTION_ICONS[nextAction] ?? null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Strategy Readiness</CardTitle>
        <CardDescription>
          Track your progress toward a complete brief
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
              {readinessText(score)}
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
              What&apos;s missing
            </h4>
            <ul className="space-y-1.5">
              {missingFields.map((field) => (
                <li
                  key={field}
                  className="flex items-start gap-2 text-sm text-[var(--color-deep-gray)]"
                >
                  <span className="inline-block mt-0.5 h-1.5 w-1.5 rounded-full bg-[var(--color-gold)] shrink-0" />
                  <span>
                    {FIELD_PLAIN_LANGUAGE[field] ?? field.replace(/_/g, " ")}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {missingFields.length === 0 && (
          <div className="text-xs text-[var(--color-success)] flex items-center gap-1.5">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-[var(--color-success)]" />
            All required fields are complete
          </div>
        )}
      </CardBody>
    </Card>
  );
}
