import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/Button";

export function Hero() {
  return (
    <section className="relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12 md:py-20 grid md:grid-cols-2 gap-8 md:gap-10 items-center">
        <div className="animate-fade-in">
          <div className="inline-flex items-center gap-1.5 text-xs font-medium text-[var(--color-gold)] bg-[#F8F1DC] border border-[#E9D9A8] px-2.5 py-1 rounded-full">
            <Sparkles className="h-3 w-3" />
            Platform publishing berbasis AI
          </div>
          <h1 className="mt-4 text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight leading-[1.08] text-pretty text-[var(--color-publiora-black)]">
            Buat ebook marketing.{" "}
            <span className="text-[var(--color-publiora-blue)]">Bagikan.</span> Distribusi otomatis.
          </h1>
          <p className="mt-4 text-base text-[var(--color-medium-gray)] max-w-lg leading-relaxed">
            Satu workspace: brief → outline → tulisan → publish → claim link. Langganan + kredit generate — bayar hanya yang dipakai.
          </p>
          <div className="mt-6 flex flex-wrap items-center gap-2.5">
            <Link href="/register">
              <Button size="lg">
                Mulai gratis
                <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </Link>
            <Link href="/read/content-engine-playbook">
              <Button size="lg" variant="outline">
                Lihat demo ebook
              </Button>
            </Link>
          </div>
          <div className="mt-5 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-sm text-[var(--color-medium-gray)]">
            <span>Kredit generate</span>
            <span className="text-[var(--color-medium-gray)]" aria-hidden="true">•</span>
            <span>Distribusi claim link</span>
            <span className="text-[var(--color-medium-gray)]" aria-hidden="true">•</span>
            <span>Export PDF + EPUB</span>
          </div>
        </div>
        <div className="relative max-w-full overflow-hidden">
          <div className="pointer-events-none absolute inset-4 sm:inset-0 bg-[var(--color-gold-soft)] rounded-[28px] blur-3xl opacity-40 md:rotate-3" />
          <div className="relative max-w-full rounded-[20px] border border-[var(--color-publiora-border)] bg-white shadow-[var(--shadow-pop)] p-3.5 md:rotate-1 md:hover:rotate-0 transition-transform duration-300">
            <div className="rounded-xl bg-[var(--color-publiora-black)] text-white p-4">
              <div className="text-[11px] uppercase tracking-[0.16em] text-[var(--color-gold)]">Workspace</div>
              <h3 className="mt-1.5 text-lg font-semibold">The Content Engine Playbook</h3>
              <div className="mt-3 space-y-0.5">
                {[
                  "§ 1. Mengapa content engine",
                  "§ 2. Strategi pillar topik",
                  "§ 3. Production loop mingguan",
                  "§ 4. Multiplex content",
                ].map((t) => (
                  <div key={t} className="text-sm text-white/80 py-1.5 border-t border-white/10">
                    {t}
                  </div>
                ))}
              </div>
              <div className="mt-3 inline-flex items-center gap-1.5 text-xs text-[var(--color-gold)]">
                <span className="h-1.5 w-1.5 rounded-full bg-[var(--color-gold)] animate-pulse-soft" />
                Menyusun outline…
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
