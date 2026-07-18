"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface TabsProps {
  value: string;
  onChange: (v: string) => void;
  tabs: { value: string; label: React.ReactNode }[];
  className?: string;
}

export function Tabs({ value, onChange, tabs, className }: TabsProps) {
  return (
    <div
      role="tablist"
      className={cn(
        "inline-flex gap-0.5 p-0.5 rounded-[var(--radius-button)] bg-[var(--color-surface-2)] border border-[var(--color-publiora-border)]",
        className
      )}
    >
      {tabs.map((tab) => {
        const active = value === tab.value;
        return (
          <button
            key={tab.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(tab.value)}
            className={cn(
              "px-2.5 sm:px-3 h-8 rounded-md text-xs sm:text-sm font-medium transition-colors whitespace-nowrap",
              active
                ? "bg-white text-[var(--color-publiora-black)] shadow-sm"
                : "text-[var(--color-medium-gray)] hover:text-[var(--color-deep-gray)]"
            )}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
