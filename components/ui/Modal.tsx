"use client";

import * as React from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children: React.ReactNode;
  size?: "sm" | "md" | "lg";
  footer?: React.ReactNode;
}

const sizeMap = {
  sm: "max-w-md",
  md: "max-w-lg",
  lg: "max-w-3xl",
};

export function Modal({ open, onClose, title, description, children, size = "md", footer }: ModalProps) {
  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
      />
      <div
        className={cn(
          "relative w-full bg-white rounded-[var(--radius-card)] shadow-[var(--shadow-pop)] animate-fade-in border border-[var(--color-publiora-border)]",
          sizeMap[size]
        )}
      >
        <div className="flex items-start justify-between px-6 pt-6">
          <div>
            {title && <h2 className="text-xl font-semibold text-[var(--color-publiora-black)]">{title}</h2>}
            {description && <p className="text-sm text-[var(--color-medium-gray)] mt-1">{description}</p>}
          </div>
          <button
            onClick={onClose}
            className="text-[var(--color-soft-gray)] hover:text-[var(--color-publiora-black)] rounded-lg p-1"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="px-6 py-5">{children}</div>
        {footer && (
          <div className="px-6 pb-6 pt-3 border-t border-[var(--color-publiora-border)] flex justify-end gap-2">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
