"use client";

import { Check, Star } from "lucide-react";
import { cn } from "@/lib/utils";
import { DEPTH_LABELS } from "@/lib/projects/project-type-copy";
import type { RankedTemplate } from "@/lib/templates/recommendation";

export function TemplateOptionCard({
  item,
  selected,
  onSelect,
}: {
  item: RankedTemplate;
  selected: boolean;
  onSelect: () => void;
}) {
  const { template, reason, recommended } = item;
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onSelect}
      className={cn(
        "p-4 rounded-xl border-2 text-left bg-white transition-colors w-full min-h-[44px]",
        selected
          ? "border-[var(--color-publiora-black)]"
          : "border-[var(--color-publiora-border)] hover:border-[var(--color-deep-gray)]",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-1.5 min-w-0">
          {recommended && (
            <Star
              className="h-3.5 w-3.5 text-amber-500 shrink-0"
              aria-hidden
              fill="currentColor"
            />
          )}
          <span className="text-sm font-semibold text-[var(--color-publiora-black)] truncate">
            {template.name}
          </span>
        </div>
        {selected && (
          <Check className="h-4 w-4 shrink-0" aria-hidden />
        )}
      </div>
      {recommended && (
        <p className="mt-1 text-[11px] font-medium text-amber-700">
          Pilihan terbaik
        </p>
      )}
      <p className="mt-1.5 text-xs text-[var(--color-medium-gray)] leading-relaxed">
        {reason}
      </p>
      <p className="mt-2 text-[11px] text-[var(--color-deep-gray)]">
        Kedalaman: {DEPTH_LABELS[template.depth]} · ±
        {template.default_section_count} bagian
      </p>
    </button>
  );
}
