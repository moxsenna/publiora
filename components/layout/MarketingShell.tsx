"use client";

import * as React from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import { Logo } from "@/components/ui/Logo";
import { Button } from "@/components/ui/Button";
import { useAuthStore } from "@/store/authStore";
import { cn } from "@/lib/utils";

const nav = [
  { href: "/#features", label: "Fitur" },
  { href: "/#how", label: "Cara kerja" },
  { href: "/#pricing", label: "Harga" },
  { href: "/projects/new", label: "Buat ebook" },
];

export function MarketingShell({ children }: { children: React.ReactNode }) {
  const profile = useAuthStore((s) => s.profile);
  const [open, setOpen] = React.useState(false);

  return (
    <div className="min-h-full flex flex-col">
      <header className="border-b border-[var(--color-publiora-border)] bg-white/90 backdrop-blur sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 h-12 flex items-center justify-between gap-2">
          <Logo size="sm" href="/" className="[&>span]:hidden sm:[&>span]:inline" />
          <nav className="hidden md:flex items-center gap-4 text-sm font-medium text-[var(--color-medium-gray)]">
            {nav.map((n) => (
              <Link
                key={n.href}
                href={n.href}
                className="hover:text-[var(--color-publiora-black)] transition-colors"
              >
                {n.label}
              </Link>
            ))}
          </nav>
          <div className="flex items-center gap-1.5">
            {profile ? (
              <Link href="/dashboard">
                <Button size="sm" variant="primary">
                  Dashboard
                </Button>
              </Link>
            ) : (
              <>
                <Link href="/login" className="hidden sm:block">
                  <Button size="sm" variant="ghost">
                    Masuk
                  </Button>
                </Link>
                <Link href="/register" className="hidden sm:block">
                  <Button size="sm" variant="primary">
                    Mulai gratis
                  </Button>
                </Link>
              </>
            )}
            <button
              className="md:hidden p-1.5 rounded-md text-[var(--color-medium-gray)] hover:bg-[var(--color-surface-2)]"
              onClick={() => setOpen((v) => !v)}
              aria-label="Toggle menu"
              aria-expanded={open}
            >
              {open ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
            </button>
          </div>
        </div>

        <div
          className={cn(
            "md:hidden border-t border-[var(--color-publiora-border)] bg-white overflow-hidden transition-[max-height,border-color] duration-200",
            open ? "max-h-96" : "max-h-0 border-t-0"
          )}
        >
          <nav className="px-3 py-2 space-y-0.5">
            {nav.map((n) => (
              <Link
                key={n.href}
                href={n.href}
                onClick={() => setOpen(false)}
                className="block px-2.5 py-2 rounded-lg text-sm font-medium text-[var(--color-medium-gray)] hover:bg-[var(--color-surface-2)] hover:text-[var(--color-publiora-black)]"
              >
                {n.label}
              </Link>
            ))}
            {!profile && (
              <>
                <Link
                  href="/login"
                  onClick={() => setOpen(false)}
                  className="block px-2.5 py-2 rounded-lg text-sm font-medium text-[var(--color-publiora-black)]"
                >
                  Masuk
                </Link>
                <Link
                  href="/register"
                  onClick={() => setOpen(false)}
                  className="block px-2.5 py-2 rounded-lg text-sm font-semibold text-white bg-[var(--color-publiora-black)] text-center"
                >
                  Mulai gratis
                </Link>
              </>
            )}
          </nav>
        </div>
      </header>

      <main className="flex-1">{children}</main>

      <footer className="border-t border-[var(--color-publiora-border)] bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 flex flex-col md:flex-row gap-6 justify-between">
          <div>
            <Logo size="sm" href="/" showText />
            <p className="text-sm text-[var(--color-medium-gray)] mt-1.5 max-w-xs">
              Buat, publish, dan distribusi ebook marketing dengan AI.
            </p>
          </div>
          <div className="flex gap-10 text-sm text-[var(--color-medium-gray)]">
            <div className="space-y-1.5">
              <div className="font-medium text-[var(--color-deep-gray)]">Produk</div>
              <Link href="/#features" className="block hover:text-[var(--color-publiora-black)]">
                Fitur
              </Link>
              <Link href="/#pricing" className="block hover:text-[var(--color-publiora-black)]">
                Harga
              </Link>
              <Link href="/dashboard" className="block hover:text-[var(--color-publiora-black)]">
                Dashboard
              </Link>
            </div>
            <div className="space-y-1.5">
              <div className="font-medium text-[var(--color-deep-gray)]">Coba</div>
              <Link
                href="/projects/new"
                className="block hover:text-[var(--color-publiora-black)]"
              >
                Buat ebook
              </Link>
              <Link
                href="/register"
                className="block hover:text-[var(--color-publiora-black)]"
              >
                Daftar gratis
              </Link>
              <Link href="/login" className="block hover:text-[var(--color-publiora-black)]">
                Masuk
              </Link>
            </div>
          </div>
        </div>
        <div className="border-t border-[var(--color-publiora-border)] px-4 sm:px-6 py-3 text-center text-xs text-[var(--color-medium-gray)]">
          © {new Date().getFullYear()} Publiora
        </div>
      </footer>
    </div>
  );
}
