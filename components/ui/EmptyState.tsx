import * as React from "react";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export function EmptyState({ icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center gap-3 py-12 px-6",
        className
      )}
    >
      {icon && (
        <div className="h-14 w-14 rounded-2xl bg-[var(--color-surface-2)] grid place-items-center text-[var(--color-medium-gray)] border border-[var(--color-publiora-border)]">
          {icon}
        </div>
      )}
      <h3 className="text-lg font-semibold text-[var(--color-publiora-black)]">{title}</h3>
      {description && (
        <p className="text-sm text-[var(--color-medium-gray)] max-w-sm">{description}</p>
      )}
      {action && <div className="mt-1">{action}</div>}
    </div>
  );
}
