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
        <div className="max-w-6xl mx-auto px-3 md:px-5 h-12 flex items-center justify-between">
          <Link href={backHref}>
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-3.5 w-3.5" />
              {backLabel}
            </Button>
          </Link>
          <div className="inline-flex items-center gap-1.5 text-sm font-semibold text-[var(--color-publiora-black)]">
            <BookOpen className="h-3.5 w-3.5 text-[var(--color-gold)]" />
            Publiora Reader
          </div>
          <div className="w-[72px]" />
        </div>
      </header>
      <main className="flex-1">{children}</main>
    </div>
  );
}
