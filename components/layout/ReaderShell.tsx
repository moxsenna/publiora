"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowLeft, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/Button";

export function ReaderShell({
  children,
  backHref = "/library",
  backLabel = "Library",
}: {
  children: React.ReactNode;
  backHref?: string;
  backLabel?: string;
}) {
  return (
    <div className="min-h-full flex flex-col bg-[var(--color-surface-2)]">
      <header className="border-b border-[var(--color-publiora-border)] bg-white sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-4 md:px-6 h-14 flex items-center justify-between">
          <Link href={backHref}>
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4" />
              {backLabel}
            </Button>
          </Link>
          <div className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--color-publiora-black)]">
            <BookOpen className="h-4 w-4 text-[var(--color-gold)]" />
            Publiora Reader
          </div>
          <div className="w-[88px]" />
        </div>
      </header>
      <main className="flex-1">{children}</main>
    </div>
  );
}
