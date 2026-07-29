"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

const controlClasses = "w-full rounded-[var(--radius-input)] border border-[var(--color-border-subtle)] bg-[var(--color-surface-1)] px-3 text-sm text-[var(--color-deep-gray)] placeholder:text-[var(--color-medium-gray)] focus:border-[var(--color-publiora-blue)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus-ring)] aria-invalid:border-[var(--color-danger)] aria-invalid:focus-visible:outline-[var(--color-danger)] transition-colors";

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => <input ref={ref} className={cn("h-11 sm:h-9", controlClasses, className)} {...props} />,
);
Input.displayName = "Input";

export const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, ...props }, ref) => <textarea ref={ref} className={cn("min-h-24 py-2.5 resize-y", controlClasses, className)} {...props} />,
);
Textarea.displayName = "Textarea";

export function Label({ className, children, htmlFor }: { className?: string; children: React.ReactNode; htmlFor?: string }) {
  return <label htmlFor={htmlFor} className={cn("mb-1 block text-xs font-medium text-[var(--color-deep-gray)]", className)}>{children}</label>;
}

type FieldRenderProps = {
  controlProps: { "aria-invalid"?: true; "aria-describedby"?: string };
  errorProps: { id: string; children?: React.ReactNode };
  hintProps: { id: string; children?: React.ReactNode };
};

export function Field({ children, error, hint, className }: { children: (props: FieldRenderProps) => React.ReactNode; error?: React.ReactNode; hint?: React.ReactNode; className?: string }) {
  const baseId = React.useId();
  const hintId = `${baseId}-hint`;
  const errorId = `${baseId}-error`;
  const describedBy = [hint && hintId, error && errorId].filter(Boolean).join(" ") || undefined;
  return <div className={cn("space-y-1", className)}>{children({
    controlProps: { "aria-invalid": error ? true : undefined, "aria-describedby": describedBy },
    hintProps: { id: hintId, children: hint },
    errorProps: { id: errorId, children: error },
  })}</div>;
}

export function FieldHint({ className, children, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  if (!children) return null;
  return <p className={cn("text-xs text-[var(--color-medium-gray)]", className)} {...props}>{children}</p>;
}

export function FieldError({ className, children, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  if (!children) return null;
  return <p className={cn("text-xs text-[var(--color-danger)]", className)} {...props}>{children}</p>;
}
