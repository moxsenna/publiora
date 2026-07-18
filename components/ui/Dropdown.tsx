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
  "aria-label"?: string;
}

export function Dropdown({
  trigger,
  items,
  align = "end",
  className,
  "aria-label": ariaLabel = "Menu",
}: DropdownProps) {
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

  const actionable = items.filter(
    (item): item is DropdownItem => item !== "divider"
  );

  return (
    <div ref={ref} className={cn("relative inline-block", className)}>
      <button
        ref={buttonRef}
        onClick={() => setOpen((o) => !o)}
        className="inline-flex"
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        aria-label={ariaLabel}
      >
        {trigger}
      </button>
      {open && (
        <div
          id={menuId}
          role="menu"
          className={cn(
            "absolute top-full mt-1.5 min-w-[180px] rounded-xl border border-[var(--color-publiora-border)] bg-white shadow-[var(--shadow-pop)] py-1 z-50 animate-fade-in",
            align === "end" ? "right-0" : "left-0"
          )}
        >
          {items.map((item, i) =>
            item === "divider" ? (
              <div
                key={i}
                role="separator"
                className="my-1 border-t border-[var(--color-publiora-border)]"
              />
            ) : (
              <button
                key={i}
                type="button"
                role="menuitem"
                onClick={() => {
                  item.onClick?.();
                  setOpen(false);
                  buttonRef.current?.focus();
                }}
                className={cn(
                  "w-full px-3 py-2 text-sm text-left flex items-center gap-2 hover:bg-[var(--color-surface-2)] min-h-9",
                  item.danger && "text-[var(--color-danger)]"
                )}
              >
                {item.icon}
                <span>{item.label}</span>
              </button>
            )
          )}
          {actionable.length === 0 && null}
        </div>
      )}
    </div>
  );
}
