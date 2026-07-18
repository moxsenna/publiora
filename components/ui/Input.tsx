"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        "h-11 w-full rounded-[var(--radius-input)] border border-[var(--color-publiora-border)] bg-white px-4 text-sm",
        "placeholder:text-[var(--color-soft-gray)] focus:border-[var(--color-publiora-blue)] focus:ring-2 focus:ring-[var(--color-publiora-blue)]/10 outline-none transition-colors",
        className
      )}
      {...props}
    />
  )
);
Input.displayName = "Input";

export const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, ...props }, ref) => (
  <textarea
    ref={ref}
    className={cn(
      "w-full rounded-[var(--radius-input)] border border-[var(--color-publiora-border)] bg-white p-4 text-sm",
      "placeholder:text-[var(--color-soft-gray)] focus:border-[var(--color-publiora-blue)] focus:ring-2 focus:ring-[var(--color-publiora-blue)]/10 outline-none transition-colors resize-y",
      className
    )}
    {...props}
  />
));
Textarea.displayName = "Textarea";

export function Label({ className, children, htmlFor }: { className?: string; children: React.ReactNode; htmlFor?: string }) {
  return (
    <label
      htmlFor={htmlFor}
      className={cn("block text-sm font-medium text-[var(--color-deep-gray)] mb-1.5", className)}
    >
      {children}
    </label>
  );
}
