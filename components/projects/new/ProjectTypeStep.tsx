"use client";

import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  EBOOK_TYPE_DESCRIPTIONS,
  EBOOK_TYPE_LABELS,
  EBOOK_TYPE_USE_CASES,
} from "@/lib/projects/project-type-copy";
import type { EbookType } from "@/types/project";

const ORDER: EbookType[] = [
  "lead_magnet",
  "bonus_product",
  "sellable_ebook",
];

export function ProjectTypeStep({
  value,
  onChange,
}: {
  value: EbookType;
  onChange: (type: EbookType) => void;
}) {
  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-lg font-bold text-[var(--color-publiora-black)]">
          Apa yang ingin Anda buat?
        </h2>
        <p className="text-sm text-[var(--color-medium-gray)] mt-1">
          Pilih berdasarkan fungsi bisnis ebook, bukan hanya panjang kontennya.
        </p>
      </div>
      <div className="grid md:grid-cols-3 gap-3">
        {ORDER.map((id) => {
          const active = value === id;
          return (
            <button
              key={id}
              type="button"
              aria-pressed={active}
              onClick={() => onChange(id)}
              className={cn(
                "p-4 rounded-xl border-2 text-left bg-white transition-colors min-h-[44px]",
                active
                  ? "border-[var(--color-publiora-black)] shadow-sm"
                  : "border-[var(--color-publiora-border)] hover:border-[var(--color-deep-gray)]",
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="text-sm font-semibold text-[var(--color-publiora-black)]">
                  {EBOOK_TYPE_LABELS[id]}
                </div>
                {active && (
                  <Check
                    className="h-4 w-4 text-[var(--color-publiora-black)] shrink-0"
                    aria-hidden
                  />
                )}
              </div>
              <p className="mt-2 text-xs text-[var(--color-medium-gray)] leading-relaxed">
                {EBOOK_TYPE_DESCRIPTIONS[id]}
              </p>
              <p className="mt-3 text-[11px] font-semibold uppercase tracking-wide text-[var(--color-deep-gray)]">
                Cocok untuk
              </p>
              <ul className="mt-1 space-y-0.5">
                {EBOOK_TYPE_USE_CASES[id].map((u) => (
                  <li
                    key={u}
                    className="text-xs text-[var(--color-medium-gray)]"
                  >
                    • {u}
                  </li>
                ))}
              </ul>
            </button>
          );
        })}
      </div>
    </section>
  );
}
