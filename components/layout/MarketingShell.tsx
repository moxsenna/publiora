"use client";

import * as React from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import { Logo } from "@/components/ui/Logo";
import { Button } from "@/components/ui/Button";
import { useAuthStore } from "@/store/authStore";
import { cn } from "@/lib/utils";

const nav = [
  { href: "/#features", label: "Features" },
  { href: "/#how", label: "How it works" },
  { href: "/#pricing", label: "Pricing" },
  { href: "/projects/new", label: "Buat ebook" },
];

export function MarketingShell({ children }: { children: React.ReactNode }) {
  const profile = useAuthStore((s) => s.profile);
  const [open, setOpen] = React.useState(false);

  return (
    <div className="min-h-full flex flex-col">
      <header className="border-b border-[var(--color-publiora-border)] bg-white/90 backdrop-blur sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-3">
          <Logo size="md" href="/" />
          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-[var(--color-medium-gray)]">
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
          <div className="flex items-center gap-2">
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
                    Sign in
                  </Button>
                </Link>
                <Link href="/register">
                  <Button size="sm" variant="primary" className="rounded-full">
                    Get started
                  </Button>
                </Link>
              </>
            )}
            <button
              className="md:hidden p-2 rounded-lg text-[var(--color-medium-gray)] hover:bg-[var(--color-surface-2)]"
              onClick={() => setOpen((v) => !v)}
              aria-label="Toggle menu"
              aria-expanded={open}
            >
              {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        <div
          className={cn(
            "md:hidden border-t border-[var(--color-publiora-border)] bg-white overflow-hidden transition-all",
            open ? "max-h-96" : "max-h-0 border-t-0"
          )}
        >
          <nav className="px-4 py-3 space-y-1">
            {nav.map((n) => (
              <Link
                key={n.href}
                href={n.href}
                onClick={() => setOpen(false)}
                className="block px-3 py-2.5 rounded-xl text-sm font-medium text-[var(--color-medium-gray)] hover:bg-[var(--color-surface-2)] hover:text-[var(--color-publiora-black)]"
              >
                {n.label}
              </Link>
            ))}
            {!profile && (
              <Link
                href="/login"
                onClick={() => setOpen(false)}
                className="block px-3 py-2.5 rounded-xl text-sm font-medium text-[var(--color-publiora-black)]"
              >
                Sign in
              </Link>
            )}
          </nav>
        </div>
      </header>

      <main className="flex-1">{children}</main>

      <footer className="border-t border-[var(--color-publiora-border)] bg-white">
        <div className="max-w-7xl mx-auto px-6 py-10 flex flex-col md:flex-row gap-8 justify-between">
          <div>
            <Logo size="sm" href="/" showText />
            <p className="text-sm text-[var(--color-medium-gray)] mt-2 max-w-xs">
              Create, publish, and distribute marketing ebooks with AI.
            </p>
          </div>
          <div className="flex gap-12 text-sm text-[var(--color-medium-gray)]">
            <div className="space-y-2">
              <div className="font-medium text-[var(--color-deep-gray)]">Product</div>
              <Link href="/#features" className="block hover:text-[var(--color-publiora-black)]">
                Features
              </Link>
              <Link href="/#pricing" className="block hover:text-[var(--color-publiora-black)]">
                Pricing
              </Link>
              <Link href="/dashboard" className="block hover:text-[var(--color-publiora-black)]">
                Dashboard
              </Link>
            </div>
            <div className="space-y-2">
              <div className="font-medium text-[var(--color-deep-gray)]">Try</div>
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
                Sign in
              </Link>
            </div>
          </div>
        </div>
        <div className="border-t border-[var(--color-publiora-border)] px-6 py-4 text-center text-xs text-[var(--color-soft-gray)]">
          © {new Date().getFullYear()} Publiora
        </div>
      </footer>
    </div>
  );
}
