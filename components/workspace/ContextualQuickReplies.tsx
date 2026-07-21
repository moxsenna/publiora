"use client";

import * as React from "react";
import type { StrategySuggestedReply } from "@/types/strategy";

// ---------------------------------------------------------------------------
// ContextualQuickReplies
//
// Renders up to four contextual quick-reply chips as buttons.
// The parent (StrategyPanel / StrategistChat) feeds suggestions from the AI
// response and controls the `disabled` state while awaiting the next AI reply.
//
// Skeleton fallback (e.g. "Menyiapkan pilihan berikutnya…") is the PARENT's
// responsibility; this component only dims/disables buttons when
// `disabled=true`.  See plan §5.4 "Behavior".
// ---------------------------------------------------------------------------

export interface ContextualQuickRepliesProps {
  /** AI-suggested replies to display (max 4 rendered). */
  suggestions: StrategySuggestedReply[];
  /** When true, all buttons are disabled to prevent double-submit during pending. */
  disabled: boolean;
  /** Called with the full suggestion object (incl. message and intent). */
  onSelect: (suggestion: StrategySuggestedReply) => void;
}

/**
 * Determine whether to expose the full `message` as the button's `title`
 * attribute (for tooltip / assistive tech).
 *
 * Heuristic: if message differs meaningfully from label, show it.
 * E.g. short label versus a longer full-sentence message.
 */
function buttonTitle(suggestion: StrategySuggestedReply): string | undefined {
  if (suggestion.message !== suggestion.label) {
    return suggestion.message;
  }
  return undefined;
}

export function ContextualQuickReplies({
  suggestions,
  disabled,
  onSelect,
}: ContextualQuickRepliesProps) {
  // Cap at 4 suggestions (the AI may send more; only the first 4 are shown).
  const visible = suggestions.slice(0, 4);

  return (
    <div
      className="flex flex-wrap gap-2 max-w-full"
      role="group"
      aria-label="Balasan cepat"
    >
      {visible.map((suggestion, index) => {
        // Defensively truncate label (Zod caps at 48, but belt-and-suspenders).
        // Number prefix helps keyboard users type 1–4 instead of clicking.
        const n = index + 1;
        const label = `${n}. ${suggestion.label.slice(0, 48)}`;

        return (
          <button
            key={`${suggestion.label}-${index}`}
            type="button"
            disabled={disabled}
            className={[
              // Base chip styling
              "inline-flex items-center rounded-full border px-3 py-1.5",
              "text-sm leading-none font-medium",
              "min-w-0 max-w-full truncate",
              "transition-colors duration-150",
              "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2",
              "focus-visible:outline-[var(--color-publiora-blue)]",
              // Enabled state — interactive look
              "border-[var(--color-publiora-border)]",
              "bg-[var(--color-surface-1)]",
              "text-[var(--color-deep-gray)]",
              "hover:border-[var(--color-publiora-blue)]",
              "hover:text-[var(--color-publiora-blue)]",
              "active:bg-[var(--color-surface-2)]",
              // Disabled state — dimmed, non-interactive
              "disabled:opacity-50 disabled:cursor-not-allowed",
              "disabled:hover:border-[var(--color-publiora-border)]",
              "disabled:hover:text-[var(--color-deep-gray)]",
            ].join(" ")}
            title={buttonTitle(suggestion)}
            onClick={() => onSelect(suggestion)}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}
