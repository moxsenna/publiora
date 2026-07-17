import * as React from "react";
import { cn } from "@/lib/utils";

interface RadioProps {
  checked: boolean;
  onChange: () => void;
  label: React.ReactNode;
  description?: string;
  className?: string;
}

export function Radio({ checked, onChange, label, description, className }: RadioProps) {
  return (
    <label
      className={cn(
        "flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all",
        checked
          ? "border-[var(--color-publiora-black)] bg-[var(--color-surface-2)]"
          : "border-[var(--color-publiora-border)] hover:bg-[var(--color-surface-2)]",
        className
      )}
    >
      <button
        type="button"
        onClick={onChange}
        className={cn(
          "mt-0.5 h-4 w-4 rounded-full border-2 grid place-items-center shrink-0",
          checked ? "border-[var(--color-publiora-black)]" : "border-[var(--color-soft-gray)]"
        )}
        aria-checked={checked}
        role="radio"
      >
        {checked && <span className="h-2 w-2 rounded-full bg-[var(--color-publiora-black)]" />}
      </button>
      <span className="flex-1">
        <span className="block text-sm font-medium text-[var(--color-deep-gray)]">{label}</span>
        {description && <span className="block text-xs text-[var(--color-medium-gray)] mt-0.5">{description}</span>}
      </span>
    </label>
  );
}
