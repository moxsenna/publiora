import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { ArrowRight } from "lucide-react";

export function FinalCTA() {
  return (
    <section className="bg-[var(--color-publiora-black)] text-white">
      <div className="max-w-7xl mx-auto px-6 py-20 md:py-24 text-center relative overflow-hidden">
        <div className="absolute -top-12 right-10 h-72 w-72 rounded-full bg-[var(--color-gold)]/20 blur-3xl" />
        <div className="absolute -bottom-12 left-10 h-72 w-72 rounded-full bg-[var(--color-publiora-blue)]/20 blur-3xl" />
        <div className="relative">
          <h2 className="text-3xl md:text-5xl font-bold tracking-tight text-pretty">
            Mulai publikasi ebook marketing pertama Anda.
          </h2>
          <p className="mt-4 text-white/70 max-w-xl mx-auto text-lg">
            Gratis untuk mulai. Dapat 50 kredit generate di plan Free — upgrade kapan saja.
          </p>
          <Link href="/register" className="inline-block mt-8">
            <Button size="lg" variant="gold">
              Buat akun gratis
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
}
