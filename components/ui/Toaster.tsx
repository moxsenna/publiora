"use client";

import { useUiStore } from "@/store/projectStore";
import { CheckCircle2, AlertCircle, Info, X } from "lucide-react";
import { cn } from "@/lib/utils";

export function Toaster() {
  const toasts = useUiStore((s) => s.toasts);
  const dismiss = useUiStore((s) => s.dismissToast);
  return (
    <div className="fixed bottom-6 right-6 z-[100] flex flex-col gap-2 w-80">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={cn(
            "rounded-2xl shadow-[var(--shadow-pop)] border bg-white px-4 py-3 flex items-start gap-3 animate-slide-in-right",
            t.variant === "success" && "border-[#A7E9C5]",
            t.variant === "danger" && "border-[#FCBABA]",
            t.variant === "default" && "border-[var(--color-publiora-border)]"
          )}
        >
          <span className="mt-0.5">
            {t.variant === "success" && <CheckCircle2 className="h-5 w-5 text-[var(--color-success)]" />}
            {t.variant === "danger" && <AlertCircle className="h-5 w-5 text-[var(--color-danger)]" />}
            {t.variant === "default" && <Info className="h-5 w-5 text-[var(--color-info)]" />}
          </span>
          <div className="flex-1">
            <div className="text-sm font-semibold text-[var(--color-deep-gray)]">{t.title}</div>
            {t.description && <div className="text-sm text-[var(--color-medium-gray)] mt-0.5">{t.description}</div>}
          </div>
          <button
            onClick={() => dismiss(t.id)}
            className="text-[var(--color-soft-gray)] hover:text-[var(--color-publiora-black)]"
            aria-label="Dismiss"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ))}
    </div>
  );
}
