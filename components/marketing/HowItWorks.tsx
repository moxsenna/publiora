const steps = [
  { num: "01", title: "Brainstorm dengan Strategist", description: "Chat / tunjukkan brief. Strategist agent pilih angle dan pillar." },
  { num: "02", title: "Outline dari Planner", description: "Outline 5–7 bagian. Edit, susun ulang, lalu approve." },
  { num: "03", title: "Generate per section", description: "Writer agent tulis section. TipTap editor untuk revisi cepat." },
  { num: "04", title: "Title & CTA generators", description: "Variasi judul + CTA, pilih yang paling menarik." },
  { num: "05", title: "Publish → claim link", description: "Satu klik jadi ebook publik. Bagikan link claim audiens." },
  { num: "06", title: "Reader access & analytics", description: "Reader klaim, masuk library, lanjut baca. Pantau event claim." },
];

export function HowItWorks() {
  return (
    <section id="how" className="bg-[var(--color-surface-2)]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12 md:py-16">
        <div className="max-w-2xl">
          <div className="text-xs font-semibold text-[var(--color-publiora-blue)] uppercase tracking-wide">
            Cara kerja
          </div>
          <h2 className="mt-2 text-2xl sm:text-3xl font-bold tracking-tight text-pretty text-[var(--color-publiora-black)]">
            Dari brief ke audience dalam 6 langkah.
          </h2>
        </div>
        <div className="mt-8 grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {steps.map((s) => (
            <div
              key={s.num}
              className="p-4 rounded-[var(--radius-card)] border border-[var(--color-publiora-border)] bg-white"
            >
              <div className="text-xl font-bold text-[var(--color-gold)]">{s.num}</div>
              <h3 className="mt-2 text-base font-semibold text-[var(--color-publiora-black)]">{s.title}</h3>
              <p className="mt-1.5 text-sm text-[var(--color-medium-gray)] leading-relaxed">{s.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
