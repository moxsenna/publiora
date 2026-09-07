import * as React from "react";
import { cn } from "@/lib/utils";

interface LoadingDotsProps extends React.HTMLAttributes<HTMLSpanElement> {
  size?: "sm" | "md" | "lg";
  label?: string;
}

const sizeClasses = {
  sm: "h-1.5 w-1.5",
  md: "h-2 w-2",
  lg: "h-2.5 w-2.5",
};

export function LoadingDots({
  size = "md",
  label = "Memuat…",
  className,
  ...props
}: LoadingDotsProps) {
  return (
    <span
      role="status"
      aria-label={label}
      className={cn("inline-flex items-center gap-1", className)}
      {...props}
    >
      <span
        aria-hidden="true"
        className={cn(
          "rounded-full bg-current animate-pulse-dot [animation-delay:0ms]",
          sizeClasses[size]
        )}
      />
      <span
        aria-hidden="true"
        className={cn(
          "rounded-full bg-current animate-pulse-dot [animation-delay:150ms]",
          sizeClasses[size]
        )}
      />
      <span
        aria-hidden="true"
        className={cn(
          "rounded-full bg-current animate-pulse-dot [animation-delay:300ms]",
          sizeClasses[size]
        )}
      />
      <span className="sr-only">{label}</span>
    </span>
  );
}
