import * as React from "react";
import { cn } from "@/lib/utils";

type Variant = "default" | "success" | "warning" | "danger" | "info" | "gold" | "outline";
export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> { variant?: Variant; semanticLabel?: string }

const styles: Record<Variant, string> = {
  default: "bg-[var(--color-surface-2)] text-[var(--color-deep-gray)] border border-[var(--color-border-subtle)]",
  success: "bg-[var(--color-success-surface)] text-[var(--color-success)] border border-[var(--color-success-border)]",
  warning: "bg-[var(--color-warning-surface)] text-[var(--color-warning)] border border-[var(--color-warning-border)]",
  danger: "bg-[var(--color-danger-surface)] text-[var(--color-danger)] border border-[var(--color-danger-border)]",
  info: "bg-[var(--color-info-surface)] text-[var(--color-info)] border border-[var(--color-info-border)]",
  gold: "bg-[var(--color-gold-surface)] text-[var(--color-gold-text)] border border-[var(--color-gold-border)]",
  outline: "bg-transparent text-[var(--color-medium-gray)] border border-[var(--color-border-subtle)]",
};

export function Badge({ variant = "default", semanticLabel, className, children, ...props }: BadgeProps) {
  return <span className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium leading-4", styles[variant], className)} {...props}>{semanticLabel && <span className="sr-only">{semanticLabel}: </span>}{children}</span>;
}
