"use client";

import * as React from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { sanitizeHtml } from "@/lib/sanitize";
import { cn } from "@/lib/utils";
import { Check, X, RefreshCw, Undo2, AlertTriangle } from "lucide-react";
import type { EnhancementSuggestion } from "@/types/ai-suggestions";

const ACTION_LABELS: Record<string, string> = {
  expand: "Expand",
  shorten: "Shorten",
  simplify: "Simplify",
  persuasive: "More persuasive",
  professional: "More professional",
  add_examples: "Add examples",
  add_checklist: "Add checklist",
};

function wordCountFromHtml(html: string): number {
  if (!html) return 0;
  const text = html.replace(/<[^>]*>/g, " ");
  const words = text
    .replace(/&[a-z]+;/gi, " ")
    .split(/\s+/)
    .filter(Boolean);
  return words.length;
}

interface EnhancementReviewDialogProps {
  open: boolean;
  onClose: () => void;
  suggestion: EnhancementSuggestion | null;
  /** The user's prior saved content (before any local edits) — used for Session Undo. */
  priorHtml: string | null;
  accepting: boolean;
  rejecting: boolean;
  regenerating: boolean;
  undoing: boolean;
  onAccept: (suggestedHtml: string) => void;
  onReject: () => void;
  onRegenerate: () => void;
  onSessionUndo: () => void;
  /** Error message from persist failure, cleared on dismiss / next attempt. */
  error?: string | null;
}

export function EnhancementReviewDialog({
  open,
  onClose,
  suggestion,
  priorHtml,
  accepting,
  rejecting,
  regenerating,
  undoing,
  onAccept,
  onReject,
  onRegenerate,
  onSessionUndo,
  error,
}: EnhancementReviewDialogProps) {
  if (!suggestion) return null;

  const actionLabel = ACTION_LABELS[suggestion.action] ?? suggestion.action;
  const originalWc = suggestion.original_word_count ?? wordCountFromHtml(suggestion.original_html);
  const suggestedWc = suggestion.suggested_word_count ?? wordCountFromHtml(suggestion.suggested_html);
  const hasUndo = !!priorHtml && priorHtml !== suggestion.original_html;

  const handleClose = () => {
    if (!accepting && !rejecting && !regenerating && !undoing) {
      onReject();
      onClose();
    }
  };

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="Review AI Enhancement"
      description={`AI enhancement: ${actionLabel}`}
      size="lg"
    >
      <div className="space-y-4">
        {/* Summary bar */}
        <div className="flex items-center gap-3 text-xs text-[var(--color-medium-gray)] bg-[var(--color-surface-2)] rounded-lg px-3 py-2 flex-wrap">
          <span className="font-semibold text-[var(--color-deep-gray)]">{actionLabel}</span>
          <span className="opacity-60">|</span>
          <span>{suggestion.summary}</span>
          <span className="opacity-60">|</span>
          <span>Original: <strong className="text-[var(--color-deep-gray)]">{originalWc}w</strong></span>
          <span className="opacity-60">|</span>
          <span>Suggested: <strong className="text-[var(--color-deep-gray)]">{suggestedWc}w</strong></span>
          <span className="opacity-60">|</span>
          <span className={cn(
            suggestedWc > originalWc ? "text-[var(--color-info)]" : "text-[var(--color-warning)]"
          )}>
            {suggestedWc > originalWc ? "+" : ""}{suggestedWc - originalWc}w
          </span>
        </div>

        {/* Error banner */}
        {error && (
          <div className="flex items-start gap-2 rounded-lg border border-[var(--color-danger)] bg-[#FEF2F2] px-3 py-2 text-sm text-[var(--color-danger)]">
            <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Side by side */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {/* Original */}
          <div className="rounded-lg border border-[var(--color-publiora-border)] overflow-hidden">
            <div className="px-3 py-1.5 bg-[var(--color-surface-2)] border-b border-[var(--color-publiora-border)]">
              <span className="text-xs font-semibold text-[var(--color-deep-gray)]">Original</span>
              <span className="ml-2 text-[11px] text-[var(--color-medium-gray)]">{originalWc} words</span>
            </div>
            <div
              className="p-3 text-sm leading-relaxed text-[var(--color-deep-gray)] max-h-[360px] overflow-y-auto overscroll-contain prose prose-sm"
              dangerouslySetInnerHTML={{ __html: sanitizeHtml(suggestion.original_html) }}
            />
          </div>

          {/* Suggested */}
          <div className="rounded-lg border border-[var(--color-publiora-border)] overflow-hidden">
            <div className="px-3 py-1.5 bg-[var(--color-surface-2)] border-b border-[var(--color-publiora-border)]">
              <span className="text-xs font-semibold text-[var(--color-publiora-black)]">Suggested</span>
              <span className="ml-2 text-[11px] text-[var(--color-medium-gray)]">{suggestedWc} words</span>
            </div>
            <div
              className="p-3 text-sm leading-relaxed text-[var(--color-deep-gray)] max-h-[360px] overflow-y-auto overscroll-contain prose prose-sm"
              dangerouslySetInnerHTML={{ __html: sanitizeHtml(suggestion.suggested_html) }}
            />
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between gap-2 flex-wrap pt-2">
        <div className="flex items-center gap-2">
          {hasUndo && (
            <Button
              variant="outline"
              size="sm"
              onClick={onSessionUndo}
              loading={undoing}
              disabled={accepting || rejecting || regenerating || undoing}
            >
              <Undo2 className="h-3.5 w-3.5" />
              Session Undo
            </Button>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              onReject();
              onClose();
            }}
            disabled={accepting || regenerating || undoing || rejecting}
            loading={rejecting}
          >
            <X className="h-3.5 w-3.5" />
            Reject
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={onRegenerate}
            loading={regenerating}
            disabled={accepting || rejecting || undoing || regenerating}
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Regenerate
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => onAccept(suggestion.suggested_html)}
            loading={accepting}
            disabled={regenerating || rejecting || undoing || accepting}
          >
            <Check className="h-3.5 w-3.5" />
            Accept
          </Button>
        </div>
      </div>
    </Modal>
  );
}
