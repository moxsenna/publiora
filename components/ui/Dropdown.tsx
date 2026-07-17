"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface DropdownItem {
  label: string;
  onClick?: () => void;
  icon?: React.ReactNode;
  danger?: boolean;
}

interface DropdownProps {
  trigger: React.ReactNode;
  items: (DropdownItem | "divider")[];
  align?: "start" | "end";
  className?: string;
}

export function Dropdown({ trigger, items, align = "end", className }: DropdownProps) {
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  return (
    <div ref={ref} className={cn("relative inline-block", className)}>
      <button onClick={() => setOpen((o) => !o)} className="inline-flex" type="button">
        {trigger}
      </button>
      {open && (
        <div
          className={cn(
            "absolute top-full mt-2 min-w-[200px] rounded-2xl border border-[var(--color-publiora-border)] bg-white shadow-[var(--shadow-pop)] py-2 z-50 animate-fade-in",
            align === "end" ? "right-0" : "left-0"
          )}
        >
          {items.map((item, i) =>
            item === "divider" ? (
              <div key={i} className="my-1 border-t border-[var(--color-publiora-border)]" />
            ) : (
              <button
                key={i}
                onClick={() => {
                  item.onClick?.();
                  setOpen(false);
                }}
                className={cn(
                  "w-full px-4 py-2 text-sm text-left flex items-center gap-2 hover:bg-[var(--color-surface-2)]",
                  item.danger && "text-[var(--color-danger)]"
                )}
              >
                {item.icon}
                <span>{item.label}</span>
              </button>
            )
          )}
        </div>
      )}
    </div>
  );
}
