import * as React from "react";
import { cn } from "@/lib/utils";

interface RadioProps {
  checked: boolean;
  onChange: () => void;
  label: React.ReactNode;
  description?: string;
  className?: string;
  name?: string;
  value?: string;
}

export function Radio({
  checked,
  onChange,
  label,
  description,
  className,
  name,
  value,
}: RadioProps) {
  return (
    <label
      className={cn(
        "flex items-start gap-2.5 p-2.5 rounded-lg border cursor-pointer transition-colors",
        checked
          ? "border-[var(--color-publiora-black)] bg-[var(--color-surface-2)]"
          : "border-[var(--color-publiora-border)] hover:bg-[var(--color-surface-2)]",
        className
      )}
    >
      <span className="relative mt-0.5 h-3.5 w-3.5 shrink-0">
        <input
          type="radio"
          name={name}
          value={value}
          checked={checked}
          onChange={onChange}
          className="peer absolute inset-0 m-0 h-full w-full cursor-pointer opacity-0"
        />
        <span
          aria-hidden="true"
          className={cn(
            "pointer-events-none h-3.5 w-3.5 rounded-full border-2 grid place-items-center peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-[var(--color-publiora-blue)]",
            checked ? "border-[var(--color-publiora-black)]" : "border-[var(--color-medium-gray)]"
          )}
        >
          {checked && <span className="h-1.5 w-1.5 rounded-full bg-[var(--color-publiora-black)]" />}
        </span>
      </span>
      <span className="flex-1 min-w-0">
        <span className="block text-sm font-medium text-[var(--color-deep-gray)]">{label}</span>
        {description && <span className="block text-xs text-[var(--color-medium-gray)] mt-0.5">{description}</span>}
      </span>
    </label>
  );
}
