import Link from "next/link";
import { cn } from "@/lib/utils";

interface LogoProps {
  size?: "sm" | "md" | "lg";
  href?: string | null;
  showText?: boolean;
  className?: string;
}

const dim = {
  sm: { box: "h-6 w-6", text: "text-sm", glyph: 12 },
  md: { box: "h-7 w-7", text: "text-base", glyph: 14 },
  lg: { box: "h-9 w-9", text: "text-lg", glyph: 18 },
};

export function Logo({ size = "md", href = "/", showText = true, className }: LogoProps) {
  const d = dim[size];
  const content = (
    <div className={cn("inline-flex items-center gap-1.5", className)}>
      <div
        className={cn(
          "rounded-md bg-[var(--color-publiora-black)] grid place-items-center text-[var(--color-publiora-white)] shrink-0",
          d.box
        )}
      >
        <svg width={d.glyph} height={d.glyph} viewBox="0 0 24 24" fill="none">
          <path
            d="M5 4h11a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3V4z"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinejoin="round"
          />
          <path d="M9 9h6M9 13h6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      </div>
      {showText && (
        <span className={cn("font-bold tracking-tight text-[var(--color-publiora-black)]", d.text)}>
          Publiora
        </span>
      )}
    </div>
  );
  if (!href) return content;
  return <Link href={href}>{content}</Link>;
}
