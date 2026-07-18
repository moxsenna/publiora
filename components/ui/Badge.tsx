import * as React from "react";
import { cn } from "@/lib/utils";

type Variant = "default" | "success" | "warning" | "danger" | "info" | "gold" | "outline";

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: Variant;
}

const styles: Record<Variant, string> = {
  default: "bg-[var(--color-surface-2)] text-[var(--color-deep-gray)] border border-[var(--color-publiora-border)]",
  success: "bg-[#ECFDF3] text-[var(--color-success)] border border-[#A7E9C5]",
  warning: "bg-[#FFFAEB] text-[var(--color-warning)] border border-[#FCD9A0]",
  danger: "bg-[#FEF2F2] text-[var(--color-danger)] border border-[#FCBABA]",
  info: "bg-[#EFF4FF] text-[var(--color-info)] border border-[#C5D4F8]",
  gold: "bg-[#F8F1DC] text-[#8B6B14] border border-[#E9D9A8]",
  outline: "bg-transparent text-[var(--color-medium-gray)] border border-[var(--color-publiora-border)]",
};

export function Badge({ variant = "default", className, children, ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium leading-4",
        styles[variant],
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
}
