"use client";

import * as React from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardBody, CardFooter } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Edit3, CheckCircle2, Circle, ChevronRight } from "lucide-react";
import type { EbookStrategy } from "@/types/strategy";
import {
  getRequiredStrategyFields,
  REQUIRED_STRATEGY_FIELDS,
} from "@/types/strategy";
import type { EbookType } from "@/types/project";
import {
  STRATEGY_COPY_ID,
  strategyBriefFieldLabel,
} from "@/lib/workflow/strategy-copy";

// ---------------------------------------------------------------------------
// Field display helpers
// ---------------------------------------------------------------------------

interface DisplayField {
  key: keyof EbookStrategy;
  type: "scalar" | "array";
}

/** Six core (informasi inti) fields shown first. */
const CORE_FIELDS: DisplayField[] = [
  { key: "topic", type: "scalar" },
  { key: "audience", type: "scalar" },
  { key: "primary_problem", type: "scalar" },
  { key: "desired_outcome", type: "scalar" },
  { key: "core_promise", type: "scalar" },
  { key: "unique_angle", type: "scalar" },
];

/** Advanced context fields hidden behind a collapsible section. */
const ADVANCED_FIELDS: DisplayField[] = [
  { key: "audience_sophistication", type: "scalar" },
  { key: "pain_points", type: "array" },
  { key: "content_pillars", type: "array" },
  { key: "product_or_offer", type: "scalar" },
  { key: "funnel_goal", type: "scalar" },
  { key: "cta_goal", type: "scalar" },
  { key: "tone", type: "scalar" },
  { key: "traffic_source", type: "scalar" },
  { key: "bonus_role", type: "scalar" },
  { key: "usage_moment", type: "scalar" },
  { key: "sales_positioning", type: "scalar" },
  { key: "buyer_objections", type: "array" },
];

function fieldValue(strategy: EbookStrategy, key: keyof EbookStrategy): string {
  const v = strategy[key];
  if (Array.isArray(v)) {
    return v.filter(Boolean).join(", ") || "";
  }
  return (v as string)?.trim() ?? "";
}

function isRequiredField(
  key: keyof EbookStrategy,
  ebookType?: EbookType | null,
): boolean {
  const required = ebookType
    ? getRequiredStrategyFields(ebookType)
    : REQUIRED_STRATEGY_FIELDS;
  return (required as string[]).includes(key);
}

function advancedFieldsForType(ebookType?: EbookType | null): DisplayField[] {
  return ADVANCED_FIELDS.filter((f) => {
    if (f.key === "funnel_goal" && ebookType === "bonus_product") return false;
    if (f.key === "traffic_source" && ebookType !== "lead_magnet") return false;
    if (
      (f.key === "bonus_role" || f.key === "usage_moment") &&
      ebookType !== "bonus_product"
    ) {
      return false;
    }
    if (
      (f.key === "sales_positioning" || f.key === "buyer_objections") &&
      ebookType !== "sellable_ebook"
    ) {
      return false;
    }
    return true;
  });
}

// ---------------------------------------------------------------------------
// FieldRow – a single brief field rendered as a clickable row
// ---------------------------------------------------------------------------

interface FieldRowProps {
  field: DisplayField;
  strategy: EbookStrategy;
  ebookType?: EbookType | null;
  onClick?: (key: keyof EbookStrategy) => void;
}

function FieldRow({ field, strategy, ebookType, onClick }: FieldRowProps) {
  const val = fieldValue(strategy, field.key);
  const filled = val.length > 0;
  const required = isRequiredField(field.key, ebookType);
  const label = strategyBriefFieldLabel(field.key, ebookType);

  const handleClick = onClick ? () => onClick(field.key) : undefined;

  return (
    <li
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onClick={handleClick}
      onKeyDown={
        onClick
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onClick(field.key);
              }
            }
          : undefined
      }
      className={`flex items-start gap-2 text-sm ${onClick ? "cursor-pointer rounded-md -mx-1 px-1 py-0.5 hover:bg-[var(--color-surface-2)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[var(--color-publiora-blue)]" : ""}`}
    >
      {filled ? (
        <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5 text-[var(--color-success)]" />
      ) : (
        <Circle className="h-4 w-4 shrink-0 mt-0.5 text-[var(--color-medium-gray)]" />
      )}
      <div className="min-w-0 flex-1">
        <span className="font-medium text-[var(--color-deep-gray)]">
          {label}
        </span>
        {required && !filled && (
          <Badge variant="warning" className="ml-1.5 align-middle">
            {STRATEGY_COPY_ID.emptyRequiredBadge}
          </Badge>
        )}
        {!required && !filled && (
          <Badge variant="outline" className="ml-1.5 align-middle">
            {STRATEGY_COPY_ID.emptyOptionalBadge}
          </Badge>
        )}
        {filled && (
          <p className="text-xs text-[var(--color-medium-gray)] mt-0.5 line-clamp-2 break-words">
            {val}
          </p>
        )}
        {!filled && (
          <p className="text-xs text-[var(--color-medium-gray)] italic mt-0.5">
            {STRATEGY_COPY_ID.emptyValue}
          </p>
        )}
      </div>
      {onClick && (
        <ChevronRight className="h-3.5 w-3.5 shrink-0 mt-0.5 text-[var(--color-medium-gray)] opacity-50" />
      )}
    </li>
  );
}

// ---------------------------------------------------------------------------
// StrategyBriefCard
// ---------------------------------------------------------------------------

interface StrategyBriefCardProps {
  strategy: EbookStrategy;
  onEdit: () => void;
  ebookType?: EbookType | null;
  /** Called when a field row is clicked, so the parent can open the editor focused on that field. */
  onEditField?: (key: keyof EbookStrategy) => void;
}

export function StrategyBriefCard({
  strategy,
  onEdit,
  onEditField,
  ebookType,
}: StrategyBriefCardProps) {
  const requiredKeys = ebookType
    ? getRequiredStrategyFields(ebookType)
    : REQUIRED_STRATEGY_FIELDS;
  const filledRequiredCount = requiredKeys.filter((key) => {
    const v = fieldValue(strategy, key);
    return v.length > 0;
  }).length;
  const requiredTotal = requiredKeys.length;
  const remaining = requiredTotal - filledRequiredCount;
  const advanced = advancedFieldsForType(ebookType);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <div>
            <CardTitle>{STRATEGY_COPY_ID.briefTitle}</CardTitle>
            <CardDescription>
              {STRATEGY_COPY_ID.briefProgress(filledRequiredCount, requiredTotal)}
            </CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={onEdit} aria-label={STRATEGY_COPY_ID.editBrief}>
            <Edit3 className="h-3.5 w-3.5" />
            {STRATEGY_COPY_ID.editBrief}
          </Button>
        </div>
      </CardHeader>

      <CardBody>
        {/* Core fields (always visible) */}
        <ul className="space-y-2" aria-label="Informasi inti strategi ebook">
          {CORE_FIELDS.map((f) => (
            <FieldRow
              key={f.key}
              field={f}
              strategy={strategy}
              ebookType={ebookType}
              onClick={onEditField}
            />
          ))}
        </ul>

        {/* Advanced fields (collapsible, collapsed by default) */}
        <details className="mt-4 group">
          <summary className="text-xs font-semibold text-[var(--color-medium-gray)] uppercase tracking-wide cursor-pointer list-none flex items-center gap-1 select-none hover:text-[var(--color-deep-gray)]">
            <span className="inline-block transition-transform group-open:rotate-90">&#9654;</span>
            {STRATEGY_COPY_ID.advancedContext}
          </summary>
          <ul className="space-y-2 mt-2 pl-1" aria-label="Konteks tambahan strategi ebook">
            {advanced.map((f) => (
              <FieldRow
                key={f.key}
                field={f}
                strategy={strategy}
                ebookType={ebookType}
                onClick={onEditField}
              />
            ))}
          </ul>
        </details>
      </CardBody>

      {remaining > 0 && (
        <CardFooter>
          <p className="text-xs text-[var(--color-gold)] w-full text-center">
            {STRATEGY_COPY_ID.footerIncomplete(remaining)}
          </p>
        </CardFooter>
      )}
    </Card>
  );
}
