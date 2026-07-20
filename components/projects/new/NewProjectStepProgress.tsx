"use client";

import { cn } from "@/lib/utils";

const ALL_STEPS = [
  { id: 1, label: "Tujuan" },
  { id: 2, label: "Ide & Produk" },
  { id: 3, label: "Format" },
  { id: 4, label: "Tinjau" },
] as const;

export function NewProjectStepProgress({
  step,
  maxStep = 4,
}: {
  step: number;
  maxStep?: number;
}) {
  const STEPS = ALL_STEPS.filter((s) => s.id <= maxStep);

  return (
    <nav aria-label="Langkah pembuatan proyek" className="w-full">
      <ol className="flex items-center gap-1 sm:gap-2">
        {STEPS.map((s) => {
          const active = step === s.id;
          const done = step > s.id;
          return (
            <li key={s.id} className="flex items-center min-w-0 flex-1">
              <div
                className={cn(
                  "flex items-center gap-1.5 min-w-0 rounded-lg px-2 py-1.5 text-xs sm:text-sm",
                  active && "bg-[var(--color-publiora-black)] text-white",
                  done && !active && "text-[var(--color-publiora-black)]",
                  !active && !done && "text-[var(--color-medium-gray)]",
                )}
                aria-current={active ? "step" : undefined}
              >
                <span
                  className={cn(
                    "inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-[11px] font-semibold",
                    active && "border-white",
                    done &&
                      !active &&
                      "border-[var(--color-publiora-black)] bg-[var(--color-publiora-black)] text-white",
                    !active &&
                      !done &&
                      "border-[var(--color-publiora-border)]",
                  )}
                >
                  {done && !active ? "✓" : s.id}
                </span>
                <span className="truncate font-medium">{s.label}</span>
              </div>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
