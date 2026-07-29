"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowLeft, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { navigationId } from "@/lib/i18n/id/navigation";

export function ReaderShell({
  children,
  backHref = "/library",
  backLabel = navigationId.library,
  readerLabel = "Pembaca Publiora",
}: {
  children: React.ReactNode;
  backHref?: string;
  backLabel?: string;
  readerLabel?: string;
}) {
  return (
    <div className="min-h-full min-w-0 overflow-x-clip flex flex-col bg-[var(--color-surface-2)]">
      <header className="border-b border-[var(--color-publiora-border)] bg-white sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-3 md:px-5 min-h-14 sm:min-h-12 grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2">
          <Link href={backHref} className="justify-self-start min-w-0 rounded-lg focus-visible:outline-2 focus-visible:outline-offset-2"><Button variant="ghost" size="sm" className="min-h-11 sm:min-h-9 max-w-full"><ArrowLeft aria-hidden="true" className="h-3.5 w-3.5 shrink-0" /><span className="truncate">{backLabel}</span></Button></Link>
          <div className="inline-flex items-center gap-1.5 text-sm font-semibold text-[var(--color-publiora-black)] whitespace-nowrap"><BookOpen aria-hidden="true" className="h-3.5 w-3.5 text-[var(--color-gold)]" />{readerLabel}</div>
          <div aria-hidden="true" />
        </div>
      </header>
      <main className="flex-1 min-w-0">{children}</main>
    </div>
  );
}
