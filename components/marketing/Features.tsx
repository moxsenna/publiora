import { MessageSquare, ListTree, PenLine, Share2, Coins, FileDown } from "lucide-react";

const features = [
  {
    icon: MessageSquare,
    title: "Chat-to-brief",
    description: "Mulai dari percakapan. Strategist agent membentuk brief dan angle dari ide Anda.",
  },
  {
    icon: ListTree,
    title: "Outline dari Planner",
    description: "Planner agent susun outline editable. Anda approve, baru tulis.",
  },
  {
    icon: PenLine,
    title: "Writer agent per section",
    description: "Section-by-section generation. Edit langsung di TipTap rich editor.",
  },
  {
    icon: Share2,
    title: "Claim link distribution",
    description: "Satu token, unlimited slot. Kontrol max_uses dan expiry per link.",
  },
  {
    icon: Coins,
    title: "Langganan + kredit",
    description: "Bayar plan bulanan, dapat kredit generate. Top-up kapan saja bila habis.",
  },
  {
    icon: FileDown,
    title: "PDF & EPUB export",
    description: "HTML print renderer untuk MVP. Export serverless untuk skala.",
  },
];

export function Features() {
  return (
    <section id="features" className="bg-white border-y border-[var(--color-publiora-border)]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12 md:py-16">
        <div className="max-w-2xl">
          <div className="text-xs font-semibold text-[var(--color-publiora-blue)] uppercase tracking-wide">
            Fitur
          </div>
          <h2 className="mt-2 text-2xl sm:text-3xl font-bold tracking-tight text-pretty text-[var(--color-publiora-black)]">
            Semua yang dibutuhkan untuk publikasi ebook marketing.
          </h2>
          <p className="mt-3 text-[var(--color-medium-gray)] text-base">
            Dari brainstorm sampai claim link — satu workspace terintegrasi.
          </p>
        </div>
        <div className="mt-8 grid sm:grid-cols-2 md:grid-cols-3 gap-3">
          {features.map((f) => {
            const Icon = f.icon;
            return (
              <div
                key={f.title}
                className="p-4 rounded-[var(--radius-card)] border border-[var(--color-publiora-border)] bg-[var(--color-surface-2)] hover:bg-white hover:shadow-[var(--shadow-card-hover)] transition-colors transition-shadow"
              >
                <div className="h-9 w-9 rounded-lg bg-[var(--color-publiora-black)] grid place-items-center text-white">
                  <Icon className="h-4 w-4" />
                </div>
                <h3 className="mt-3 text-base font-semibold text-[var(--color-publiora-black)]">{f.title}</h3>
                <p className="mt-1.5 text-sm text-[var(--color-medium-gray)] leading-relaxed">{f.description}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
