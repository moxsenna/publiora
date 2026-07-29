import Link from "next/link";
import Image from "next/image";
import { cn } from "@/lib/utils";

interface LogoProps {
  size?: "sm" | "md" | "lg";
  href?: string | null;
  showText?: boolean;
  className?: string;
}

const dim = {
  sm: { mark: 24, text: { w: 130, h: 40 } },
  md: { mark: 28, text: { w: 150, h: 46 } },
  lg: { mark: 36, text: { w: 180, h: 55 } },
};

export function Logo({
  size = "md",
  href = "/",
  showText = true,
  className,
}: LogoProps) {
  const d = dim[size];
  const content = (
    <div className={cn("inline-flex items-center gap-1.5", className)}>
      {showText ? (
        <Image
          src="/brand/logo-text.webp"
          alt="Publiora"
          width={d.text.w}
          height={d.text.h}
          className="h-auto w-auto"
          priority
        />
      ) : (
        <Image
          src="/brand/logo-mark.webp"
          alt="Publiora"
          width={d.mark}
          height={d.mark}
          className="shrink-0"
          priority
        />
      )}
    </div>
  );
  if (!href) return content;
  return <Link href={href}>{content}</Link>;
}
