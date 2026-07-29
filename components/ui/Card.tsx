import * as React from "react";
import { cn } from "@/lib/utils";

export function Card({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("min-w-0 break-words rounded-[var(--radius-card)] border border-[var(--color-border-subtle)] bg-[var(--color-surface-1)] shadow-[var(--shadow-card)] focus-within:ring-2 focus-within:ring-[var(--color-focus-ring)] focus-within:ring-offset-2", className)} {...props}>{children}</div>;
}

export function CardHeader({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("min-w-0 px-4 pt-4 pb-2 sm:px-5 sm:pt-5", className)} {...props}>{children}</div>;
}

export function CardTitle({ className, children, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return <h3 className={cn("min-w-0 break-words text-base font-semibold text-[var(--color-publiora-black)]", className)} {...props}>{children}</h3>;
}

export function CardDescription({ className, children, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn("mt-0.5 min-w-0 break-words text-xs text-[var(--color-medium-gray)]", className)} {...props}>{children}</p>;
}

export function CardBody({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("min-w-0 break-words px-4 py-3 sm:px-5 sm:py-4", className)} {...props}>{children}</div>;
}

export function CardFooter({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("min-w-0 border-t border-[var(--color-border-subtle)] px-4 pb-4 pt-2 sm:px-5 sm:pb-5 sm:pt-3", className)} {...props}>{children}</div>;
}
