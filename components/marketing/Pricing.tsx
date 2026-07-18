import Link from "next/link";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/Button";

const tiers = [
  {
    name: "free",
    price: "Gratis",
    tagline: "Untuk mencoba Publiora.",
    features: [
      "50 kredit / bulan",
      "3 projects aktif",
      "1 ebook published",
      "Claim link unlimited",
    ],
    cta: { href: "/register", label: "Mulai" },
  },
  {
    name: "creator",
    price: "Rp299rb",
    tagline: "Untuk creator solo.",
    features: [
      "500 kredit / bulan",
      "Unlimited projects",
      "10 ebook published",
      "PDF + EPUB export",
      "Analytics claim dasar",
    ],
    cta: { href: "/register", label: "Pilih creator" },
    featured: true,
  },
  {
    name: "pro",
    price: "Rp749rb",
    tagline: "Untuk tim kecil.",
    features: [
      "2.000 kredit / bulan",
      "Unlimited published",
      "Priority generation queue",
      "CSV export claim events",
      "Custom cover branding",
    ],
    cta: { href: "/register", label: "Pilih pro" },
  },
];

export function Pricing() {
  return (
    <section id="pricing" className="bg-white">
      <div className="max-w-7xl mx-auto px-6 py-20">
        <div className="text-center max-w-2xl mx-auto">
          <div className="text-sm font-semibold text-[var(--color-publiora-blue)] uppercase tracking-wide">
            Harga
          </div>
          <h2 className="mt-3 text-4xl font-bold tracking-tight text-pretty text-[var(--color-publiora-black)]">
            Langganan + kredit generate.
          </h2>
          <p className="mt-4 text-[var(--color-medium-gray)] text-lg">
            Plan memberi kuota bulanan. Butuh lebih? Top-up kredit kapan saja.
          </p>
        </div>
        <div className="mt-12 grid md:grid-cols-2 lg:grid-cols-3 gap-6 items-start">
          {tiers.map((t) => (
            <div
              key={t.name}
              className={
                "p-8 rounded-[var(--radius-card)] border bg-white " +
                (t.featured
                  ? "border-[var(--color-publiora-black)] shadow-[var(--shadow-pop)] relative md:col-span-2 lg:col-span-1"
                  : "border-[var(--color-publiora-border)]")
              }
            >
              {t.featured && (
                <span className="absolute -top-3 left-8 inline-flex items-center gap-1 text-xs font-semibold bg-[var(--color-gold)] text-[var(--color-publiora-black)] px-3 py-1 rounded-full">
                  Paling populer
                </span>
              )}
              <div className="text-sm uppercase tracking-wide text-[var(--color-medium-gray)] font-medium">
                {t.name}
              </div>
              <div className="mt-2 flex items-baseline gap-1">
                <span className="text-4xl font-bold text-[var(--color-publiora-black)]">
                  {t.price}
                </span>
                {t.price !== "Gratis" && (
                  <span className="text-sm text-[var(--color-medium-gray)]">/bln</span>
                )}
              </div>
              <p className="mt-2 text-sm text-[var(--color-medium-gray)]">{t.tagline}</p>
              <ul className="mt-6 space-y-3 text-sm">
                {t.features.map((f) => (
                  <li key={f} className="flex items-start gap-3">
                    <Check className="h-4 w-4 text-[var(--color-success)] mt-0.5 shrink-0" />
                    <span className="text-[var(--color-deep-gray)]">{f}</span>
                  </li>
                ))}
              </ul>
              <Link href={t.cta.href} className="block mt-8">
                <Button variant={t.featured ? "primary" : "outline"} className="w-full">
                  {t.cta.label}
                </Button>
              </Link>
            </div>
          ))}
        </div>
        <p className="mt-8 text-center text-sm text-[var(--color-medium-gray)]">
          Biaya generate: outline 5 · section 10 · title/CTA 2 kredit. Top-up tersedia di Billing.
        </p>
      </div>
    </section>
  );
}
