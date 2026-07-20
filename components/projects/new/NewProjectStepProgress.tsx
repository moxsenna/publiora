"use client";

import { cn } from "@/lib/utils";

const STEPS = [
  { id: 1, label: "Tujuan" },
  { id: 2, label: "Brief" },
  { id: 3, label: "Format" },
  { id: 4, label: "Tinjau" },
] as const;

export function NewProjectStepProgress({ step }: { step: number }) {
  return (
    <nav aria-label="Langkah pembuatan proyek" className="w-full">
      <ol className="flex items-center gap-1 sm:gap-2">
        {STEPS.map((s, idx) => {
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
                  {s.id}
                </span>
                <span className="truncate hidden sm:inline font-medium">
                  {s.label}
                </span>
                <span className="sm:hidden font-medium">{s.id}/4</span>
              </div>
              {idx < STEPS.length - 1 && (
                <div
                  className={cn(
                    "mx-1 h-px flex-1 min-w-2",
                    done
                      ? "bg-[var(--color-publiora-black)]"
                      : "bg-[var(--color-publiora-border)]",
                  )}
                  aria-hidden
                />
              )}
            </li>
          );
        })}
      </ol>
      <p className="sr-only">
        Langkah {step} dari 4: {STEPS[step - 1]?.label}
      </p>
    </nav>
  );
}
