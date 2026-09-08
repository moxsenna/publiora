import * as React from "react";
import { AlertCircle, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/Button";

interface LoadingStateProps extends React.HTMLAttributes<HTMLDivElement> {
  label?: string;
}
interface ErrorStateProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, "title"> {
  title?: string;
  description?: string;
  retryLabel?: string;
  onRetry?: () => void;
}

export function LoadingState({
  label = "Memuat…",
  className,
  ...props
}: LoadingStateProps) {
  return (
    <div
      role="status"
      className={cn(
        "flex min-h-48 flex-col items-center justify-center gap-3.5 text-center text-sm text-[var(--color-medium-gray)]",
        className
      )}
      {...props}
    >
      <div className="relative flex items-center justify-center">
        <span className="absolute h-12 w-12 rounded-full bg-[var(--color-publiora-blue)]/15 blur-md animate-pulse-glow" />
        <span className="absolute h-10 w-10 rounded-full bg-[var(--color-surface-2)] border border-[var(--color-publiora-border)] shadow-xs" />
        <Loader2
          aria-hidden="true"
          className="relative h-5 w-5 animate-spin text-[var(--color-publiora-blue)]"
        />
      </div>
      <span className="animate-pulse-soft font-medium tracking-wide">{label}</span>
    </div>
  );
}

export function ErrorState({
  title = "Terjadi kesalahan",
  description,
  retryLabel = "Coba lagi",
  onRetry,
  className,
  ...props
}: ErrorStateProps) {
  return (
    <div
      role="alert"
      className={cn(
        "flex min-h-40 flex-col items-center justify-center text-center",
        className
      )}
      {...props}
    >
      <AlertCircle
        aria-hidden="true"
        className="mb-3 h-6 w-6 text-[var(--color-danger)]"
      />
      <h2 className="text-base font-semibold">{title}</h2>
      {description && (
        <p className="mt-1.5 max-w-prose text-sm text-[var(--color-medium-gray)]">
          {description}
        </p>
      )}
      {onRetry && (
        <Button className="mt-4" variant="outline" onClick={onRetry}>
          {retryLabel}
        </Button>
      )}
    </div>
  );
}
