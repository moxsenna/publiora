"use client";

import { useUiStore } from "@/store/projectStore";
import { CheckCircle2, AlertCircle, Info, X } from "lucide-react";
import { cn } from "@/lib/utils";

export function Toaster() {
  const toasts = useUiStore((s) => s.toasts);
  const dismiss = useUiStore((s) => s.dismissToast);
  return (
    <div
      className="fixed z-[100] flex flex-col gap-2 w-[min(20rem,calc(100vw-1.5rem))] left-1/2 -translate-x-1/2 bottom-[max(1.5rem,env(safe-area-inset-bottom))] sm:left-auto sm:right-[max(1.5rem,env(safe-area-inset-right))] sm:translate-x-0 sm:bottom-[max(1.5rem,env(safe-area-inset-bottom))]"
      aria-live="polite"
      aria-relevant="additions text"
      role="status"
    >
      {toasts.map((t) => (
        <div
          key={t.id}
          className={cn(
            "rounded-xl shadow-[var(--shadow-pop)] border bg-white px-3 py-2.5 flex items-start gap-2.5 animate-slide-in-right",
            t.variant === "success" && "border-[#A7E9C5]",
            t.variant === "danger" && "border-[#FCBABA]",
            t.variant === "default" && "border-[var(--color-publiora-border)]"
          )}
        >
          <span className="mt-0.5" aria-hidden="true">
            {t.variant === "success" && (
              <CheckCircle2 className="h-4 w-4 text-[var(--color-success)]" />
            )}
            {t.variant === "danger" && (
              <AlertCircle className="h-4 w-4 text-[var(--color-danger)]" />
            )}
            {t.variant === "default" && (
              <Info className="h-4 w-4 text-[var(--color-info)]" />
            )}
          </span>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold text-[var(--color-deep-gray)]">
              {t.title}
            </div>
            {t.description && (
              <div className="text-xs text-[var(--color-medium-gray)] mt-0.5">
                {t.description}
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={() => dismiss(t.id)}
            className="text-[var(--color-medium-gray)] hover:text-[var(--color-publiora-black)] min-h-8 min-w-8 grid place-items-center -mr-1 -mt-0.5"
            aria-label="Tutup notifikasi"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      ))}
    </div>
  );
}
