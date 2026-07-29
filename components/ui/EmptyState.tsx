import * as React from "react";
import { cn } from "@/lib/utils";

interface EmptyStateProps { icon?: React.ReactNode; title: string; description?: string; action?: React.ReactNode; className?: string }

export function EmptyState({ icon, title, description, action, className }: EmptyStateProps) {
  return <div className={cn("flex flex-col items-center justify-center text-center py-8 px-4", className)}>
    {icon && <div aria-hidden="true" className="mb-3 h-10 w-10 rounded-xl bg-[var(--color-surface-2)] grid place-items-center text-[var(--color-medium-gray)] border border-[var(--color-border-subtle)]">{icon}</div>}
    <h3 className="text-base font-semibold text-[var(--color-publiora-black)]">{title}</h3>
    {description && <p className="mt-1.5 text-sm text-[var(--color-medium-gray)] max-w-prose">{description}</p>}
    {action && <div className="mt-4">{action}</div>}
  </div>;
}
