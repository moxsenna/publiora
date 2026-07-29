"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

type Variant = "primary" | "secondary" | "ghost" | "danger" | "gold" | "outline";
type Size = "sm" | "md" | "lg" | "icon";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  loadingLabel?: string;
}

const variantClasses: Record<Variant, string> = {
  primary: "bg-[var(--color-publiora-black)] text-[var(--color-publiora-white)] hover:bg-[var(--color-deep-gray)] shadow-sm",
  secondary: "bg-[var(--color-surface-2)] text-[var(--color-deep-gray)] hover:bg-[var(--color-surface-3)] border border-[var(--color-border-subtle)]",
  ghost: "bg-transparent text-[var(--color-deep-gray)] hover:bg-[var(--color-surface-2)]",
  danger: "bg-[var(--color-danger)] text-white hover:opacity-90",
  gold: "bg-[var(--color-gold)] text-[var(--color-publiora-black)] hover:brightness-95",
  outline: "bg-transparent border border-[var(--color-border-subtle)] text-[var(--color-deep-gray)] hover:bg-[var(--color-surface-2)]",
};

const sizeClasses: Record<Size, string> = {
  sm: "min-h-11 px-2.5 text-xs sm:min-h-0 sm:h-8",
  md: "min-h-11 px-3.5 text-sm sm:min-h-0 sm:h-9",
  lg: "min-h-11 px-4 text-sm sm:min-h-0 sm:h-10",
  icon: "min-h-11 min-w-11 p-0 sm:min-h-0 sm:min-w-0 sm:h-9 sm:w-9",
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", loading = false, loadingLabel, children, disabled, type = "button", "aria-label": ariaLabel, ...props }, ref) => {
    const iconOnlyLoadingLabel = loading && !children && loadingLabel ? loadingLabel : ariaLabel;
    return (
      <button
        ref={ref}
        type={type}
        disabled={disabled || loading}
        aria-busy={loading || undefined}
        aria-label={iconOnlyLoadingLabel}
        className={cn(
          "inline-flex items-center justify-center gap-1.5 rounded-[var(--radius-button)] font-medium transition-colors duration-150 select-none",
          "disabled:opacity-50 disabled:cursor-not-allowed",
          variantClasses[variant], sizeClasses[size], className,
        )}
        {...props}
      >
        {loading && <span aria-hidden="true" className="h-4 w-4 rounded-full border-2 border-current border-t-transparent animate-spin" />}
        {children}
      </button>
    );
  },
);
Button.displayName = "Button";

export type { ButtonProps };
