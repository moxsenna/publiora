"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

type TabItem = { value: string; label: React.ReactNode; content?: React.ReactNode; disabled?: boolean };
interface TabsProps { value: string; onChange: (value: string) => void; tabs: TabItem[]; className?: string; ariaLabel?: string }

function safeId(value: string) { return value.replace(/[^a-zA-Z0-9_-]/g, "-"); }

export function Tabs({ value, onChange, tabs, className, ariaLabel = "Pilihan tampilan" }: TabsProps) {
  const baseId = React.useId();
  const refs = React.useRef(new Map<string, HTMLButtonElement>());
  const enabledTabs = tabs.filter((tab) => !tab.disabled);
  const onKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>, currentValue: string) => {
    if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key) || !enabledTabs.length) return;
    event.preventDefault();
    const currentIndex = enabledTabs.findIndex((tab) => tab.value === currentValue);
    let targetIndex = currentIndex;
    if (event.key === "Home") targetIndex = 0;
    else if (event.key === "End") targetIndex = enabledTabs.length - 1;
    else if (event.key === "ArrowRight") targetIndex = (currentIndex + 1) % enabledTabs.length;
    else targetIndex = (currentIndex - 1 + enabledTabs.length) % enabledTabs.length;
    const target = enabledTabs[targetIndex];
    onChange(target.value);
    refs.current.get(target.value)?.focus();
  };
  const activeTab = tabs.find((tab) => tab.value === value);
  const tabId = (tab: TabItem) => `${baseId}-tab-${safeId(tab.value)}`;
  const panelId = (tab: TabItem) => `${baseId}-panel-${safeId(tab.value)}`;

  return <>
    <div role="tablist" aria-label={ariaLabel} className={cn("flex max-w-full overflow-x-auto no-scrollbar gap-0.5 p-0.5 rounded-[var(--radius-button)] bg-[var(--color-surface-2)] border border-[var(--color-border-subtle)]", className)}>
      {tabs.map((tab) => {
        const active = value === tab.value;
        return <button key={tab.value} ref={(node) => { if (node) refs.current.set(tab.value, node); else refs.current.delete(tab.value); }} id={tabId(tab)} type="button" role="tab" aria-selected={active} aria-controls={tab.content !== undefined ? panelId(tab) : undefined} tabIndex={active ? 0 : -1} disabled={tab.disabled} onClick={() => onChange(tab.value)} onKeyDown={(event) => onKeyDown(event, tab.value)} className={cn("min-h-11 px-2.5 sm:min-h-0 sm:h-8 sm:px-3 rounded-md text-xs sm:text-sm font-medium transition-colors whitespace-nowrap disabled:opacity-50", active ? "bg-[var(--color-surface-1)] text-[var(--color-publiora-black)] shadow-sm" : "text-[var(--color-medium-gray)] hover:text-[var(--color-deep-gray)]")}>{tab.label}</button>;
      })}
    </div>
    {activeTab?.content !== undefined && <div id={panelId(activeTab)} role="tabpanel" aria-labelledby={tabId(activeTab)} tabIndex={0}>{activeTab.content}</div>}
  </>;
}

export type { TabsProps, TabItem };
