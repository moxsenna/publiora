"use client";

import * as React from "react";
import { Wand2, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import type { EnhancementAction } from "@/types/ai-suggestions";

interface EnhancementActionDef {
  label: string;
  description: string;
  action: EnhancementAction;
}

const ENHANCEMENT_ACTIONS: EnhancementActionDef[] = [
  { label: "Expand", description: "Perpanjang penjelasan dengan detail tambahan", action: "expand" },
  { label: "Shorten", description: "Ringkas tulisan tanpa menghilangkan inti", action: "shorten" },
  { label: "Simplify", description: "Sederhanakan bahasa agar lebih mudah dipahami", action: "simplify" },
  { label: "More persuasive", description: "Perkuat argumen dengan bahasa persuasif", action: "persuasive" },
  { label: "More professional", description: "Tingkatkan keformalan dan profesionalitas bahasa", action: "professional" },
  { label: "Add examples", description: "Tambahkan contoh konkret untuk memperjelas", action: "add_examples" },
  { label: "Add checklist", description: "Tambahkan checklist langkah atau poin penting", action: "add_checklist" },
];

interface EnhancementMenuProps {
  onAction: (action: EnhancementAction) => void;
  loading?: boolean;
  disabled?: boolean;
}

export function EnhancementMenu({ onAction, loading, disabled }: EnhancementMenuProps) {
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef<HTMLDivElement>(null);
  const buttonRef = React.useRef<HTMLButtonElement>(null);
  const menuId = React.useId();

  React.useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        setOpen(false);
        buttonRef.current?.focus();
      }
    };
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const canOpen = !disabled && !loading;

  return (
    <div ref={ref} className="relative inline-block">
      <button
        ref={buttonRef}
        type="button"
        disabled={disabled || loading}
        onClick={() => canOpen && setOpen((o) => !o)}
        className={cn(
          "h-8 px-2.5 text-xs inline-flex items-center gap-1.5 rounded-[var(--radius-button)] font-medium transition-colors duration-150 select-none",
          "bg-transparent border border-[var(--color-publiora-border)] text-[var(--color-deep-gray)] hover:bg-[var(--color-surface-2)]",
          "disabled:opacity-50 disabled:cursor-not-allowed"
        )}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        aria-label="Enhance section"
        title={disabled ? "Tidak ada konten section untuk di-enhance" : "Enhance section dengan AI"}
      >
        {loading ? (
          <span className="h-3.5 w-3.5 rounded-full border-2 border-current border-t-transparent animate-spin" />
        ) : (
          <Wand2 className="h-3.5 w-3.5" />
        )}
        Enhance
        <ChevronDown className={cn("h-3 w-3 transition-transform", open && "rotate-180")} />
      </button>

      {open && (
        <div
          id={menuId}
          role="menu"
          className={cn(
            "absolute top-full right-0 mt-1.5 w-64 rounded-xl border border-[var(--color-publiora-border)] bg-white shadow-[var(--shadow-pop)] py-1 z-50 animate-fade-in"
          )}
        >
          <div className="px-3 py-2 border-b border-[var(--color-publiora-border)]">
            <p className="text-xs font-semibold text-[var(--color-publiora-black)]">
              AI Enhancement
            </p>
            <p className="text-[11px] text-[var(--color-medium-gray)] mt-0.5">
              Terapkan ke seluruh section
            </p>
          </div>
          {ENHANCEMENT_ACTIONS.map((def) => (
            <button
              key={def.action}
              type="button"
              role="menuitem"
              onClick={() => {
                onAction(def.action);
                setOpen(false);
                buttonRef.current?.focus();
              }}
              className="w-full px-3 py-2 text-left hover:bg-[var(--color-surface-2)] min-h-9"
            >
              <span className="block text-sm font-medium text-[var(--color-deep-gray)]">
                {def.label}
              </span>
              <span className="block text-[11px] text-[var(--color-medium-gray)] mt-0.5">
                {def.description}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
