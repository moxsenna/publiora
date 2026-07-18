import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/Button";

export function Hero() {
  return (
    <section className="relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-6 py-20 md:py-28 grid md:grid-cols-2 gap-12 items-center">
        <div className="animate-fade-in">
          <div className="inline-flex items-center gap-2 text-xs font-medium text-[var(--color-gold)] bg-[var(--color-gold-soft)]/25 border border-[var(--color-gold-soft)] px-3 py-1.5 rounded-full">
            <Sparkles className="h-3.5 w-3.5" />
            AI-native publishing platform
          </div>
          <h1 className="mt-6 text-5xl md:text-6xl font-bold tracking-tight leading-[1.05] text-[var(--color-publiora-black)]">
            Buat ebook marketing. <br />
            <span className="text-[var(--color-publiora-blue)]">Bagikan.</span> Distribusi otomatis.
          </h1>
          <p className="mt-6 text-lg text-[var(--color-medium-gray)] max-w-lg leading-relaxed">
            Satu workspace: brief → outline → tulisan → publish → claim link. Langganan + kredit generate — bayar hanya yang dipakai.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link href="/register">
              <Button size="lg">
                Mulai gratis
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link href="/read/content-engine-playbook">
              <Button size="lg" variant="outline">
                Lihat demo ebook
              </Button>
            </Link>
          </div>
          <div className="mt-8 flex items-center gap-6 text-sm text-[var(--color-soft-gray)]">
            <span>Kredit generate</span>
            <span>•</span>
            <span>Claim link distribution</span>
            <span>•</span>
            <span>PDF + EPUB export</span>
          </div>
        </div>
        <div className="relative">
          <div className="absolute inset-0 bg-[var(--color-gold-soft)] rounded-[40px] blur-3xl opacity-40 rotate-3" />
          <div className="relative rounded-[32px] border border-[var(--color-publiora-border)] bg-white shadow-[var(--shadow-pop)] p-5 rotate-1 hover:rotate-0 transition-transform duration-300">
            <div className="rounded-2xl bg-[var(--color-publiora-black)] text-white p-6">
              <div className="text-xs uppercase tracking-[0.18em] text-[var(--color-gold)]">Workspace</div>
              <h3 className="mt-2 text-2xl font-semibold">The Content Engine Playbook</h3>
              <div className="mt-4 space-y-2">
                {[
                  "§ 1. Mengapa content engine",
                  "§ 2. Strategi pillar topik",
                  "§ 3. Production loop mingguan",
                  "§ 4. Multiplex content",
                ].map((t) => (
                  <div key={t} className="text-sm text-white/80 py-2 border-t border-white/10">
                    {t}
                  </div>
                ))}
              </div>
              <div className="mt-5 inline-flex items-center gap-2 text-xs text-[var(--color-gold)]">
                <span className="h-1.5 w-1.5 rounded-full bg-[var(--color-gold)] animate-pulse-soft" />
                Generating outline…
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
