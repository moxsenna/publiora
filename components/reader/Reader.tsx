"use client";

import * as React from "react";
import Link from "next/link";
import { ReaderShell } from "@/components/layout/ReaderShell";
import { Button } from "@/components/ui/Button";
import { useUpdateReadingProgress } from "@/lib/api/hooks";
import type { PublishedEbook } from "@/types";
import { cn } from "@/lib/utils";
import { List, X } from "lucide-react";

interface ReaderProps {
  ebook: PublishedEbook;
  backHref?: string;
  backLabel?: string;
}

export function Reader({ ebook, backHref = "/library", backLabel = "Library" }: ReaderProps) {
  const [active, setActive] = React.useState(0);
  const [tocOpen, setTocOpen] = React.useState(false);
  const updateProgress = useUpdateReadingProgress();
  const sectionRefs = React.useRef<(HTMLElement | null)[]>([]);

  React.useEffect(() => {
    const observers: IntersectionObserver[] = [];
    sectionRefs.current.forEach((el, idx) => {
      if (!el) return;
      const obs = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) setActive(idx);
          });
        },
        { rootMargin: "-40% 0px -50% 0px", threshold: 0 }
      );
      obs.observe(el);
      observers.push(obs);
    });
    return () => observers.forEach((o) => o.disconnect());
  }, [ebook.sections.length]);

  React.useEffect(() => {
    if (ebook.sections.length === 0) return;
    const progress = Math.round(((active + 1) / ebook.sections.length) * 100);
    updateProgress.mutate({
      ebook_id: ebook.id,
      patch: { progress, current_section: active + 1 },
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, ebook.id, ebook.sections.length]);

  const scrollTo = React.useCallback(
    (idx: number) => {
      const next = Math.max(0, Math.min(ebook.sections.length - 1, idx));
      sectionRefs.current[next]?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
      setActive(next);
      setTocOpen(false);
    },
    [ebook.sections.length]
  );

  // Keyboard: j/↓/→ next, k/↑/← prev, t toggle TOC, Esc close
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      const tag = el?.tagName;
      if (
        tag === "INPUT" ||
        tag === "TEXTAREA" ||
        el?.isContentEditable
      ) {
        return;
      }
      if (e.key === "Escape") {
        setTocOpen(false);
        return;
      }
      if (e.key === "t" || e.key === "T") {
        setTocOpen((v) => !v);
        return;
      }
      if (e.key === "j" || e.key === "ArrowDown" || e.key === "ArrowRight") {
        e.preventDefault();
        scrollTo(active + 1);
      }
      if (e.key === "k" || e.key === "ArrowUp" || e.key === "ArrowLeft") {
        e.preventDefault();
        scrollTo(active - 1);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [active, scrollTo]);

  const progressPct = ebook.sections.length
    ? Math.round(((active + 1) / ebook.sections.length) * 100)
    : 0;

  return (
    <ReaderShell backHref={backHref} backLabel={backLabel}>
      <div className="h-0.5 bg-[var(--color-surface-3)] sticky top-14 z-20">
        <div
          className="h-full bg-[var(--color-publiora-blue)] transition-[width] duration-200"
          style={{ width: `${progressPct}%` }}
        />
      </div>

      <div className="max-w-6xl mx-auto px-4 md:px-6 py-8 flex gap-8">
        {/* Desktop TOC */}
        <aside className="hidden lg:block w-64 shrink-0">
          <div className="sticky top-24 space-y-1">
            <div className="text-xs font-semibold uppercase tracking-wide text-[var(--color-medium-gray)] mb-3">
              Daftar isi
            </div>
            {ebook.sections.map((s, i) => (
              <button
                key={s.id}
                type="button"
                onClick={() => scrollTo(i)}
                className={cn(
                  "w-full text-left px-3 py-2 rounded-xl text-sm transition-colors",
                  i === active
                    ? "bg-[var(--color-publiora-black)] text-white"
                    : "text-[var(--color-medium-gray)] hover:bg-[var(--color-surface-2)]"
                )}
              >
                <span className="text-xs opacity-70 mr-1.5">{i + 1}.</span>
                {s.title}
              </button>
            ))}
          </div>
        </aside>

        {/* Reading area */}
        <article className="flex-1 min-w-0">
          <div
            className="rounded-[var(--radius-card)] p-8 md:p-12 mb-10 text-white"
            style={{ background: ebook.cover_color }}
          >
            <div className="text-xs uppercase tracking-wide opacity-70 mb-3">Publiora</div>
            <h1 className="text-3xl md:text-4xl font-bold leading-tight">{ebook.title}</h1>
            {ebook.subtitle && (
              <p className="mt-3 text-base opacity-90 text-[var(--color-gold-soft)]">{ebook.subtitle}</p>
            )}
            <p className="mt-6 text-sm opacity-80">oleh {ebook.author}</p>
            <p className="mt-3 text-xs opacity-70 hidden sm:block">
              Keyboard: J/K atau ←/→ pindah section · T daftar isi · Esc tutup
            </p>
          </div>

          <div className="bg-white rounded-[var(--radius-card)] shadow-[var(--shadow-card)] px-8 md:px-12 py-10 border border-[var(--color-publiora-border)]/50">
            {ebook.sections.map((s, i) => (
              <section
                key={s.id}
                id={`section-${i + 1}`}
                ref={(el) => {
                  sectionRefs.current[i] = el;
                }}
                className="reader-prose mb-16 last:mb-0 scroll-mt-24"
              >
                <h2>{s.title}</h2>
                <div dangerouslySetInnerHTML={{ __html: s.content_html }} />
                {i === ebook.sections.length - 1 && (
                  <div className="not-prose mt-10 rounded-2xl border border-[var(--color-publiora-border)] bg-[var(--color-surface-2)] p-6">
                    <p className="text-sm text-[var(--color-medium-gray)]">
                      Selesai membaca? Simpan ebook di library dan lanjutkan kapan saja.
                    </p>
                    <Link href="/library" className="inline-block mt-3">
                      <Button size="sm">Kembali ke library</Button>
                    </Link>
                  </div>
                )}
              </section>
            ))}
          </div>
        </article>
      </div>

      {/* Mobile TOC button */}
      <button
        type="button"
        onClick={() => setTocOpen(true)}
        className="lg:hidden fixed bottom-[max(1.5rem,env(safe-area-inset-bottom))] right-[max(1.5rem,env(safe-area-inset-right))] h-12 w-12 rounded-full bg-[var(--color-publiora-black)] text-white shadow-[var(--shadow-pop)] grid place-items-center"
        aria-label="Buka daftar isi"
      >
        <List className="h-5 w-5" />
      </button>

      {tocOpen && (
        <div className="lg:hidden fixed inset-0 z-50 bg-black/40 overscroll-contain" onClick={() => setTocOpen(false)}>
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Daftar isi"
            className="absolute bottom-0 inset-x-0 bg-white rounded-t-3xl p-5 max-h-[70vh] overflow-y-auto overscroll-contain"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold">Daftar isi</h3>
              <button type="button" onClick={() => setTocOpen(false)} aria-label="Tutup">
                <X className="h-5 w-5 text-[var(--color-medium-gray)]" />
              </button>
            </div>
            <div className="space-y-1">
              {ebook.sections.map((s, i) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => scrollTo(i)}
                  className={cn(
                    "w-full text-left px-3 py-2.5 rounded-xl text-sm",
                    i === active
                      ? "bg-[var(--color-publiora-black)] text-white"
                      : "text-[var(--color-medium-gray)] hover:bg-[var(--color-surface-2)]"
                  )}
                >
                  {i + 1}. {s.title}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </ReaderShell>
  );
}
