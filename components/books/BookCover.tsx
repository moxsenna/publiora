import * as React from "react";
import { cn } from "@/lib/utils";
import {
  resolveBookCoverColor,
  EDITORIAL_BOOK_PALETTE,
  CATEGORY_PALETTES,
} from "@/lib/books/colors";

export { resolveBookCoverColor, EDITORIAL_BOOK_PALETTE, CATEGORY_PALETTES };

export type BookCoverSize = "sm" | "md" | "lg" | "fill";

export interface BookCoverProps extends React.HTMLAttributes<HTMLDivElement> {
  title: string;
  id?: string;
  author?: string;
  subtitle?: string | null;
  category?: string;
  coverColor?: string;
  size?: BookCoverSize;
  badge?: React.ReactNode;
}

const sizeClasses: Record<BookCoverSize, { container: string; title: string; author: string; brand: string }> = {
  sm: {
    container: "w-20 h-28 rounded-r-md rounded-l-xs",
    title: "text-xs font-bold leading-tight line-clamp-2",
    author: "text-[10px] line-clamp-1 opacity-75",
    brand: "text-[8px]",
  },
  md: {
    container: "w-32 sm:w-36 h-44 sm:h-48 rounded-r-lg rounded-l-xs",
    title: "text-sm font-bold leading-snug line-clamp-3",
    author: "text-xs line-clamp-1 opacity-80",
    brand: "text-[9px]",
  },
  lg: {
    container: "w-44 sm:w-52 h-60 sm:h-72 rounded-r-xl rounded-l-xs",
    title: "text-lg font-bold leading-tight line-clamp-4",
    author: "text-xs line-clamp-1 opacity-85",
    brand: "text-[10px]",
  },
  fill: {
    container: "w-full h-full aspect-[3/4] rounded-r-lg rounded-l-xs",
    title: "text-sm sm:text-base font-bold leading-snug line-clamp-3",
    author: "text-xs line-clamp-1 opacity-80",
    brand: "text-[9px]",
  },
};

export function BookCover({
  title,
  id,
  author,
  subtitle,
  category,
  coverColor,
  size = "md",
  badge,
  className,
  ...props
}: BookCoverProps) {
  const currentSize = sizeClasses[size];
  const resolvedBg = resolveBookCoverColor({
    coverColor,
    id,
    title,
    category,
  });

  return (
    <div
      className={cn(
        "relative select-none overflow-hidden text-white flex flex-col justify-between p-3 sm:p-3.5 transition-all duration-200",
        "shadow-[2px_4px_16px_rgba(0,0,0,0.18),0_1px_3px_rgba(0,0,0,0.12)]",
        "ring-1 ring-black/10",
        currentSize.container,
        className
      )}
      style={{
        backgroundColor: resolvedBg,
        backgroundImage:
          "linear-gradient(135deg, rgba(255, 255, 255, 0.12) 0%, rgba(255, 255, 255, 0) 50%, rgba(0, 0, 0, 0.25) 100%)",
      }}
      {...props}
    >
      {/* Spine 3D simulation crease (left edge) */}
      <div
        aria-hidden="true"
        className="absolute inset-y-0 left-0 w-2.5 pointer-events-none bg-gradient-to-r from-black/35 via-black/10 to-transparent border-r border-white/10"
      />
      {/* Book spine highlight line */}
      <div
        aria-hidden="true"
        className="absolute inset-y-0 left-1 w-px pointer-events-none bg-white/20"
      />

      {/* Page edge trim highlight (right edge) */}
      <div
        aria-hidden="true"
        className="absolute inset-y-0 right-0 w-1.5 pointer-events-none bg-gradient-to-l from-black/25 via-black/5 to-transparent"
      />

      {/* Top Header / Publisher Branding / Badge */}
      <div className="relative z-10 flex items-start justify-between gap-1.5 min-w-0">
        <div className="flex flex-col min-w-0">
          <span
            className={cn(
              "font-semibold tracking-[0.18em] uppercase opacity-70 truncate font-sans",
              currentSize.brand
            )}
          >
            {category || "PUBLIORA"}
          </span>
        </div>
        {badge ? <div className="shrink-0">{badge}</div> : null}
      </div>

      {/* Center / Body: Title and Subtitle */}
      <div className="relative z-10 my-auto py-1">
        <h4
          className={cn(
            "text-white font-semibold tracking-tight drop-shadow-sm text-balance",
            currentSize.title
          )}
        >
          {title}
        </h4>
        {subtitle && size !== "sm" ? (
          <p className="mt-1 text-[11px] leading-tight text-white/75 line-clamp-1 font-normal">
            {subtitle}
          </p>
        ) : null}
      </div>

      {/* Bottom Footer: Author & Subtle watermark */}
      <div className="relative z-10 pt-1 flex items-end justify-between gap-1 border-t border-white/15">
        <span
          className={cn(
            "font-medium text-white/90 truncate",
            currentSize.author
          )}
        >
          {author || "Publiora Creator"}
        </span>
        <span className="text-[8px] tracking-widest uppercase text-white/40 font-mono shrink-0">
          ED.
        </span>
      </div>
    </div>
  );
}
