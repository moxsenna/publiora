import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { ArrowRight } from "lucide-react";

export function FinalCTA() {
  return (
    <section className="bg-[var(--color-publiora-black)] text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12 md:py-16 text-center relative overflow-hidden">
        <div className="absolute -top-12 right-10 h-56 w-56 rounded-full bg-[var(--color-gold)]/20 blur-3xl" />
        <div className="absolute -bottom-12 left-10 h-56 w-56 rounded-full bg-[var(--color-publiora-blue)]/20 blur-3xl" />
        <div className="relative">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight text-pretty">
            Mulai publikasi ebook marketing pertama Anda.
          </h2>
          <p className="mt-3 text-white/70 max-w-xl mx-auto text-base">
            Gratis untuk mulai. Dapat 50 kredit generate di plan Free — upgrade kapan saja.
          </p>
          <Link href="/register" className="inline-block mt-6">
            <Button size="lg" variant="gold">
              Buat akun gratis
              <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
}
