"use client";

import * as React from "react";
import { Sparkles, Brain, FileText, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

export type AiLoadingVariant = "writing" | "outline" | "review" | "general";

interface AiLoadingAnimationProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: AiLoadingVariant;
  title?: string;
  subtitle?: string;
  steps?: string[];
  compact?: boolean;
}

const DEFAULT_STEPS: Record<AiLoadingVariant, string[]> = {
  writing: [
    "Menganalisis outline & sasaran pembaca…",
    "Menyusun struktur argumen & alur narasi…",
    "Mengembangkan draf konten section dengan AI…",
    "Memoles pilihan kata & ritme keterbacaan…",
  ],
  outline: [
    "Mempelajari strategi produk & target pembaca…",
    "Menentukan pilar konten & urutan bab logis…",
    "Menyusun ringkasan & poin kunci tiap bab…",
    "Menyelaraskan struktur buku terstandar…",
  ],
  review: [
    "Memeriksa kelengkapan seluruh section…",
    "Menganalisis koherensi & konsistensi narasi…",
    "Mengevaluasi kesiapan penerbitan…",
  ],
  general: [
    "Menyiapkan ruang kerja…",
    "Memproses data & mengoptimalkan konten…",
    "Menyelesaikan permintaan Anda…",
  ],
};

const VARIANT_ICONS: Record<AiLoadingVariant, React.ReactNode> = {
  writing: <Sparkles className="h-4 w-4 text-[var(--color-publiora-blue)]" />,
  outline: <Brain className="h-4 w-4 text-[var(--color-publiora-blue)]" />,
  review: <CheckCircle2 className="h-4 w-4 text-[var(--color-publiora-emerald)]" />,
  general: <FileText className="h-4 w-4 text-[var(--color-publiora-blue)]" />,
};

export function AiLoadingAnimation({
  variant = "writing",
  title,
  subtitle,
  steps,
  compact = false,
  className,
  ...props
}: AiLoadingAnimationProps) {
  const activeSteps = steps && steps.length > 0 ? steps : DEFAULT_STEPS[variant];
  const [currentStepIndex, setCurrentStepIndex] = React.useState(0);

  React.useEffect(() => {
    if (activeSteps.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentStepIndex((prev) => (prev + 1) % activeSteps.length);
    }, 2500);
    return () => clearInterval(interval);
  }, [activeSteps.length]);

  const defaultTitle =
    variant === "writing"
      ? "AI Sedang Menulis Section"
      : variant === "outline"
      ? "AI Sedang Menyusun Outline"
      : variant === "review"
      ? "AI Sedang Meninjau Naskah"
      : "Memproses Permintaan…";

  const displayTitle = title || defaultTitle;
  const currentStep = activeSteps[currentStepIndex];

  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        "relative overflow-hidden rounded-2xl border border-[var(--color-publiora-border)] bg-white/95 p-6 shadow-sm backdrop-blur-sm",
        "flex flex-col items-center justify-center text-center",
        compact ? "p-4 max-w-sm" : "p-6 sm:p-8 max-w-md w-full",
        className
      )}
      {...props}
    >
      {/* Ambient background glow */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-12 -left-12 h-36 w-36 rounded-full bg-[var(--color-publiora-blue)]/10 blur-2xl animate-pulse-glow"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-10 -right-10 h-36 w-36 rounded-full bg-[var(--color-gold)]/15 blur-2xl animate-pulse-glow"
        style={{ animationDelay: "1.2s" }}
      />

      {/* Animated SVG Manuscript & Quill Illustration */}
      <div className="relative mb-5 flex items-center justify-center">
        {/* Soft background disk */}
        <div className="h-20 w-20 rounded-full bg-[var(--color-surface-2)] flex items-center justify-center border border-[var(--color-publiora-border)]/60 shadow-inner">
          <svg
            className="h-12 w-12 text-[var(--color-publiora-black)]"
            viewBox="0 0 64 64"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
          >
            {/* Sheet of paper */}
            <rect
              x="16"
              y="10"
              width="32"
              height="44"
              rx="4"
              fill="white"
              stroke="currentColor"
              strokeWidth="2"
              className="animate-float-slow"
            />
            {/* Fold corner */}
            <path
              d="M40 10V18H48"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            {/* Shimmering written lines */}
            <line
              x1="22"
              y1="22"
              x2="38"
              y2="22"
              stroke="var(--color-publiora-blue)"
              strokeWidth="2.5"
              strokeLinecap="round"
              className="animate-pulse"
            />
            <line
              x1="22"
              y1="28"
              x2="42"
              y2="28"
              stroke="#A3A3A3"
              strokeWidth="2"
              strokeLinecap="round"
              className="animate-pulse"
              style={{ animationDelay: "200ms" }}
            />
            <line
              x1="22"
              y1="34"
              x2="36"
              y2="34"
              stroke="#A3A3A3"
              strokeWidth="2"
              strokeLinecap="round"
              className="animate-pulse"
              style={{ animationDelay: "400ms" }}
            />
            <line
              x1="22"
              y1="40"
              x2="40"
              y2="40"
              stroke="var(--color-gold)"
              strokeWidth="2"
              strokeLinecap="round"
              className="animate-pulse"
              style={{ animationDelay: "600ms" }}
            />
            <line
              x1="22"
              y1="46"
              x2="30"
              y2="46"
              stroke="#D4D4D4"
              strokeWidth="2"
              strokeLinecap="round"
              className="animate-pulse"
              style={{ animationDelay: "800ms" }}
            />
          </svg>
        </div>

        {/* Floating magic stylus / sparkles badge */}
        <div className="absolute -top-1 -right-1 h-7 w-7 rounded-full bg-[var(--color-publiora-black)] text-[var(--color-publiora-white)] flex items-center justify-center shadow-md animate-pen-draft">
          <Sparkles className="h-3.5 w-3.5 text-[var(--color-gold)] animate-spin" style={{ animationDuration: "3s" }} />
        </div>
      </div>

      {/* Title & Subtitle */}
      <div className="space-y-1 mb-4 max-w-sm">
        <h3 className="text-base font-semibold text-[var(--color-publiora-black)] tracking-tight">
          {displayTitle}
        </h3>
        {subtitle && (
          <p className="text-xs text-[var(--color-medium-gray)] line-clamp-2 px-2 font-medium">
            {subtitle}
          </p>
        )}
      </div>

      {/* Active Phase Badge / Step Rotator */}
      <div className="w-full max-w-xs rounded-xl bg-[var(--color-surface-2)] px-3.5 py-2.5 border border-[var(--color-publiora-border)]/80 flex items-center gap-2.5 text-left mb-4 shadow-xs">
        <div className="shrink-0 flex items-center justify-center h-6 w-6 rounded-lg bg-white shadow-2xs">
          {VARIANT_ICONS[variant]}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-1 text-[10px] text-[var(--color-medium-gray)] font-medium">
            <span>Tahap {currentStepIndex + 1} dari {activeSteps.length}</span>
            <span className="flex items-center gap-0.5">
              <span className="h-1.5 w-1.5 rounded-full bg-[var(--color-publiora-blue)] animate-ping" />
              <span className="text-[10px] text-[var(--color-publiora-blue)] font-semibold">Proses</span>
            </span>
          </div>
          <div
            key={currentStepIndex}
            className="text-xs font-medium text-[var(--color-publiora-black)] truncate animate-fade-in"
          >
            {currentStep}
          </div>
        </div>
      </div>

      {/* Shimmer skeleton lines simulation */}
      {!compact && (
        <div className="w-full max-w-xs space-y-2 pt-1" aria-hidden="true">
          <div className="h-2 w-full rounded-full skeleton" />
          <div className="h-2 w-5/6 mx-auto rounded-full skeleton" style={{ animationDelay: "150ms" }} />
          <div className="h-2 w-4/6 mx-auto rounded-full skeleton" style={{ animationDelay: "300ms" }} />
        </div>
      )}

      <span className="sr-only">
        {displayTitle}: {currentStep}
      </span>
    </div>
  );
}
