"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

type Variant = "primary" | "secondary" | "ghost" | "danger" | "gold" | "outline";
type Size = "sm" | "md" | "lg" | "icon";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
}

const variantClasses: Record<Variant, string> = {
  primary:
    "bg-[var(--color-publiora-black)] text-[var(--color-publiora-white)] hover:bg-[var(--color-deep-gray)] shadow-sm",
  secondary:
    "bg-[var(--color-surface-2)] text-[var(--color-deep-gray)] hover:bg-[var(--color-surface-3)] border border-[var(--color-publiora-border)]",
  ghost:
    "bg-transparent text-[var(--color-deep-gray)] hover:bg-[var(--color-surface-2)]",
  danger: "bg-[var(--color-danger)] text-white hover:opacity-90",
  gold: "bg-[var(--color-gold)] text-[var(--color-publiora-black)] hover:brightness-95",
  outline:
    "bg-transparent border border-[var(--color-publiora-border)] text-[var(--color-deep-gray)] hover:bg-[var(--color-surface-2)]",
};

const sizeClasses: Record<Size, string> = {
  sm: "h-8 px-2.5 text-xs",
  md: "h-9 px-3.5 text-sm",
  lg: "h-10 px-4 text-sm",
  icon: "h-9 w-9 p-0",
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = "primary",
      size = "md",
      loading,
      children,
      disabled,
      type = "button",
      ...props
    },
    ref
  ) => {
    return (
      <button
        ref={ref}
        type={type}
        disabled={disabled || loading}
        className={cn(
          "inline-flex items-center justify-center gap-1.5 rounded-[var(--radius-button)] font-medium transition-colors duration-150 select-none",
          "disabled:opacity-50 disabled:cursor-not-allowed",
          variantClasses[variant],
          sizeClasses[size],
          className
        )}
        {...props}
      >
        {loading && (
          <span className="h-4 w-4 rounded-full border-2 border-current border-t-transparent animate-spin" />
        )}
        {children}
      </button>
    );
  }
);
Button.displayName = "Button";
