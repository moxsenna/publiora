"use client";

import * as React from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  size?: "sm" | "md" | "lg";
  footer?: React.ReactNode;
  closeOnEscape?: boolean;
  closeOnBackdrop?: boolean;
  preventClose?: boolean;
}

const sizeMap = { sm: "max-w-md", md: "max-w-lg", lg: "max-w-3xl" };
const focusableSelector = 'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function Modal({ open, onClose, title, description, children, size = "md", footer, closeOnEscape = true, closeOnBackdrop = true, preventClose = false }: ModalProps) {
  const panelRef = React.useRef<HTMLDivElement>(null);
  const previousFocusRef = React.useRef<HTMLElement | null>(null);
  const titleId = React.useId();
  const descriptionId = React.useId();
  const closeStateRef = React.useRef({ onClose, closeOnEscape, closeOnBackdrop, preventClose });
  React.useEffect(() => {
    closeStateRef.current = { onClose, closeOnEscape, closeOnBackdrop, preventClose };
  }, [onClose, closeOnEscape, closeOnBackdrop, preventClose]);
  const requestClose = React.useCallback(() => {
    const state = closeStateRef.current;
    if (!state.preventClose) state.onClose();
  }, []);

  React.useEffect(() => {
    if (!open) return;
    previousFocusRef.current = document.activeElement as HTMLElement | null;
    const panel = panelRef.current;
    const timer = window.setTimeout(() => (panel?.querySelector<HTMLElement>(focusableSelector) ?? panel)?.focus(), 0);
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        const state = closeStateRef.current;
        if (!state.closeOnEscape || state.preventClose) return;
        event.preventDefault();
        state.onClose();
        return;
      }
      if (event.key !== "Tab" || !panel) return;
      const nodes = Array.from(panel.querySelectorAll<HTMLElement>(focusableSelector)).filter((element) => element.tabIndex !== -1);
      if (!nodes.length) { event.preventDefault(); panel.focus(); return; }
      const first = nodes[0];
      const last = nodes[nodes.length - 1];
      const active = document.activeElement;
      if (event.shiftKey && (active === first || !panel.contains(active))) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && (active === last || !panel.contains(active))) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener("keydown", onKey);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.clearTimeout(timer);
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previousOverflow;
      previousFocusRef.current?.focus();
    };
  }, [open]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overscroll-contain">
      <div data-testid="modal-backdrop" className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-modal-backdrop-enter" onClick={() => { if (closeStateRef.current.closeOnBackdrop) requestClose(); }} aria-hidden="true" />
      <div ref={panelRef} role="dialog" aria-modal="true" aria-labelledby={title ? titleId : undefined} aria-describedby={description ? descriptionId : undefined} tabIndex={-1} className={cn("relative w-full max-h-[calc(100dvh-2rem)] overflow-y-auto overscroll-contain bg-[var(--color-surface-1)] rounded-[var(--radius-card)] shadow-[var(--shadow-pop)] animate-modal-enter border border-[var(--color-border-subtle)] outline-none", sizeMap[size])}>
        <div className="flex items-start justify-between px-4 pt-4 gap-3 sm:px-5 sm:pt-5">
          <div className="min-w-0">
            {title && <h2 id={titleId} className="text-base font-semibold text-[var(--color-publiora-black)]">{title}</h2>}
            {description && <p id={descriptionId} className="text-sm text-[var(--color-medium-gray)] mt-0.5">{description}</p>}
          </div>
          <button type="button" onClick={requestClose} disabled={preventClose} className="text-[var(--color-medium-gray)] hover:text-[var(--color-publiora-black)] rounded-md min-h-11 min-w-11 sm:min-h-9 sm:min-w-9 grid place-items-center shrink-0 disabled:opacity-50" aria-label="Tutup dialog"><X aria-hidden="true" className="h-4 w-4" /></button>
        </div>
        <div className="px-4 py-3 sm:px-5 sm:py-4">{children}</div>
        {footer && <div className="px-4 pb-4 pt-2 sm:px-5 sm:pb-5 border-t border-[var(--color-border-subtle)] flex justify-end gap-2">{footer}</div>}
      </div>
    </div>
  );
}

export type { ModalProps };
