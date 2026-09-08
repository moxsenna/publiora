"use client";

import * as React from "react";
import { Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

interface GlobalLoadingProps extends React.HTMLAttributes<HTMLDivElement> {
  label?: string;
  description?: string;
  fullscreen?: boolean;
}

export function GlobalLoading({
  label = "Memuat Publiora…",
  description = "Menyiapkan ruang kerja dan konten naskah Anda",
  fullscreen = false,
  className,
  ...props
}: GlobalLoadingProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        "flex flex-col items-center justify-center text-center p-6",
        fullscreen ? "fixed inset-0 z-50 bg-[var(--color-publiora-white)]/90 backdrop-blur-sm" : "min-h-[280px] w-full",
        className
      )}
      {...props}
    >
      <div className="relative mb-4 flex items-center justify-center">
        {/* Glowing pulse rings */}
        <div className="absolute h-16 w-16 rounded-full bg-[var(--color-publiora-blue)]/15 blur-xl animate-pulse-glow" />
        
        {/* Animated Brand Vector Emblem */}
        <div className="relative h-14 w-14 rounded-2xl bg-[var(--color-publiora-black)] text-[var(--color-publiora-white)] flex items-center justify-center shadow-lg animate-float-slow">
          <svg
            className="h-7 w-7 text-white"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5Z" />
            <path d="M6 6h10" />
            <path d="M6 10h7" />
          </svg>

          {/* Sparkle badge */}
          <div className="absolute -top-1.5 -right-1.5 h-5 w-5 rounded-full bg-[var(--color-gold)] text-[var(--color-publiora-black)] flex items-center justify-center shadow-xs">
            <Sparkles className="h-3 w-3 animate-spin" style={{ animationDuration: "2.5s" }} />
          </div>
        </div>
      </div>

      <div className="space-y-1 max-w-xs">
        <h4 className="text-sm font-semibold text-[var(--color-publiora-black)] tracking-tight">
          {label}
        </h4>
        {description && (
          <p className="text-xs text-[var(--color-medium-gray)]">
            {description}
          </p>
        )}
      </div>

      {/* Pulsing loading bar */}
      <div className="mt-4 h-1 w-32 overflow-hidden rounded-full bg-[var(--color-surface-3)]">
        <div className="h-full w-full rounded-full bg-[var(--color-publiora-blue)] animate-draw-line" />
      </div>
    </div>
  );
}
