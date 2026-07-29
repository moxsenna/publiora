"use client";

import * as React from "react";
import Link from "next/link";
import { BookOpen, Feather } from "lucide-react";
import { Logo } from "@/components/ui/Logo";

export function AuthShell({ children, title, description, footer }: { children: React.ReactNode; title: string; description?: string; footer?: React.ReactNode }) {
  return <main className="min-h-full overflow-x-hidden bg-white md:grid md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
    <section aria-labelledby="auth-title" className="flex min-h-full min-w-0 flex-col justify-between px-5 py-6 sm:px-10 sm:py-8 lg:px-16">
      <Logo size="sm" href="/" />
      <div className="my-10 w-full max-w-md self-center">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-publiora-blue)]">Akun Publiora</p>
        <h1 id="auth-title" className="mt-3 text-3xl font-bold tracking-tight text-balance text-[var(--color-publiora-black)] sm:text-4xl">{title}</h1>
        {description && <p className="mt-3 text-sm leading-relaxed text-pretty text-[var(--color-medium-gray)] sm:text-base">{description}</p>}
        <div className="mt-7">{children}</div>
      </div>
      <p className="text-xs text-[var(--color-medium-gray)]">© 2026 Publiora. Dibuat untuk kreator.</p>
    </section>
    <aside aria-label="Tentang Publiora" className="relative hidden min-w-0 overflow-hidden bg-[var(--color-publiora-black)] p-10 text-white md:flex lg:p-16">
      <BookOpen aria-hidden="true" className="absolute right-12 top-12 h-24 w-24 text-white/[0.04]" />
      <Feather aria-hidden="true" className="absolute bottom-12 left-12 h-20 w-20 text-[var(--color-gold)]/[0.08]" />
      <div className="relative z-10 my-auto max-w-xl">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--color-gold)]">Penerbitan dengan bantuan AI</p>
        <blockquote className="mt-8 text-3xl font-semibold leading-tight text-balance lg:text-4xl">“Ubah gagasan menjadi ebook bernilai, lalu terbitkan saat setiap bagian siap.”</blockquote>
        <p className="mt-6 max-w-md text-sm leading-relaxed text-white/65">Strategi, penulisan, penyuntingan, dan distribusi tersusun dalam satu ruang kerja editorial.</p>
      </div>
    </aside>
    {footer && <div className="px-8 py-4 text-sm text-[var(--color-medium-gray)] md:col-span-2">{footer}</div>}
  </main>;
}

export function AuthSwitch({ question, href, label }: { question: string; href: string; label: string }) {
  return <p className="mt-6 text-sm text-[var(--color-medium-gray)]">{question} <Link href={href} className="inline-flex min-h-11 items-center font-semibold text-[var(--color-publiora-blue)] underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2">{label}</Link></p>;
}
