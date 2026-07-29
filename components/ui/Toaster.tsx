"use client";

import { useUiStore } from "@/store/projectStore";
import { CheckCircle2, AlertCircle, Info, X } from "lucide-react";
import { cn } from "@/lib/utils";

export function Toaster() {
  const toasts = useUiStore((state) => state.toasts);
  const dismiss = useUiStore((state) => state.dismissToast);
  const seenIds = new Set<string>();
  const uniqueToasts = toasts.filter((toast) => {
    if (seenIds.has(toast.id)) return false;
    seenIds.add(toast.id);
    return true;
  });
  return <div data-testid="toast-container" className="fixed z-[100] flex flex-col gap-2 w-[min(20rem,calc(100vw-1.5rem))] left-1/2 -translate-x-1/2 bottom-[max(1.5rem,env(safe-area-inset-bottom))] sm:left-auto sm:right-[max(1.5rem,env(safe-area-inset-right))] sm:translate-x-0">
    {uniqueToasts.map((toast) => <div key={toast.id} role={toast.variant === "danger" ? "alert" : "status"} aria-live={toast.variant === "danger" ? "assertive" : "polite"} className={cn("rounded-xl shadow-[var(--shadow-pop)] border bg-[var(--color-surface-1)] px-3 py-2.5 flex items-start gap-2.5 animate-slide-in-right", toast.variant === "success" && "border-[var(--color-success-border)]", toast.variant === "danger" && "border-[var(--color-danger-border)]", toast.variant === "default" && "border-[var(--color-border-subtle)]")}>
      <span className="mt-0.5" aria-hidden="true">{toast.variant === "success" && <CheckCircle2 className="h-4 w-4 text-[var(--color-success)]" />}{toast.variant === "danger" && <AlertCircle className="h-4 w-4 text-[var(--color-danger)]" />}{toast.variant === "default" && <Info className="h-4 w-4 text-[var(--color-info)]" />}</span>
      <div className="flex-1 min-w-0"><div className="text-sm font-semibold text-[var(--color-deep-gray)]">{toast.title}</div>{toast.description && <div className="text-xs text-[var(--color-medium-gray)] mt-0.5">{toast.description}</div>}</div>
      <button type="button" onClick={() => dismiss(toast.id)} className="text-[var(--color-medium-gray)] hover:text-[var(--color-publiora-black)] min-h-11 min-w-11 sm:min-h-8 sm:min-w-8 grid place-items-center -mr-1 -my-2" aria-label="Tutup notifikasi"><X aria-hidden="true" className="h-3.5 w-3.5" /></button>
    </div>)}
  </div>;
}
