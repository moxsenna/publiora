"use client";

import * as React from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import { Logo } from "@/components/ui/Logo";
import { useAuthStore } from "@/store/authStore";
import { navigationId } from "@/lib/i18n/id/navigation";

const MOBILE_NAV_ID = "marketing-mobile-navigation";
const nav = [
  { href: "/#features", label: "Fitur" },
  { href: "/#how", label: "Cara kerja" },
  { href: "/#pricing", label: "Harga" },
  { href: "/projects/new", label: "Buat ebook" },
] as const;

export function MarketingShell({ children }: { children: React.ReactNode }) {
  const profile = useAuthStore((s) => s.profile);
  const [open, setOpen] = React.useState(false);
  const triggerRef = React.useRef<HTMLButtonElement>(null);

  React.useEffect(() => {
    const desktop = window.matchMedia("(min-width: 768px)");
    const onChange = (event: MediaQueryListEvent) => {
      if (event.matches) setOpen(false);
    };
    desktop.addEventListener("change", onChange);
    return () => desktop.removeEventListener("change", onChange);
  }, []);

  React.useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      setOpen(false);
      window.setTimeout(() => triggerRef.current?.focus(), 0);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  const close = () => setOpen(false);
  return (
    <div className="min-h-full min-w-0 overflow-x-clip flex flex-col">
      <header className="border-b border-[var(--color-publiora-border)] bg-white/90 backdrop-blur sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 h-14 sm:h-12 flex items-center justify-between gap-2">
          <Logo size="sm" href="/" />
          <nav aria-label="Navigasi utama" className="hidden md:flex items-center gap-4 text-sm font-medium text-[var(--color-medium-gray)]">
            {nav.map((item) => <Link key={item.href} href={item.href} className="rounded-md hover:text-[var(--color-publiora-black)] transition-colors focus-visible:outline-2 focus-visible:outline-offset-2">{item.label}</Link>)}
          </nav>
          <div className="flex items-center gap-1.5">
            {profile ? <Link href="/dashboard" className="inline-flex min-h-11 items-center justify-center rounded-[var(--radius-button)] bg-[var(--color-publiora-black)] px-2.5 text-xs font-medium text-[var(--color-publiora-white)] shadow-sm transition-colors hover:bg-[var(--color-deep-gray)] focus-visible:outline-2 focus-visible:outline-offset-2 sm:min-h-0 sm:h-8">{navigationId.dashboard}</Link> : <><Link href="/login" className="hidden min-h-11 items-center justify-center rounded-[var(--radius-button)] px-2.5 text-xs font-medium text-[var(--color-deep-gray)] transition-colors hover:bg-[var(--color-surface-2)] focus-visible:outline-2 focus-visible:outline-offset-2 sm:inline-flex sm:min-h-0 sm:h-8">Masuk</Link><Link href="/register" className="hidden min-h-11 items-center justify-center rounded-[var(--radius-button)] bg-[var(--color-publiora-black)] px-2.5 text-xs font-medium text-[var(--color-publiora-white)] shadow-sm transition-colors hover:bg-[var(--color-deep-gray)] focus-visible:outline-2 focus-visible:outline-offset-2 sm:inline-flex sm:min-h-0 sm:h-8">Mulai gratis</Link></>}
            <button ref={triggerRef} type="button" className="md:hidden min-h-11 min-w-11 grid place-items-center rounded-lg text-[var(--color-medium-gray)] hover:bg-[var(--color-surface-2)] focus-visible:outline-2 focus-visible:outline-offset-2" onClick={() => setOpen((value) => !value)} aria-label={open ? "Tutup menu navigasi" : "Buka menu navigasi"} aria-expanded={open} aria-controls={MOBILE_NAV_ID}>
              {open ? <X aria-hidden="true" className="h-4 w-4" /> : <Menu aria-hidden="true" className="h-4 w-4" />}
            </button>
          </div>
        </div>
        {open ? (
          <nav id={MOBILE_NAV_ID} aria-label="Navigasi seluler" className="md:hidden border-t border-[var(--color-publiora-border)] bg-white px-3 py-2 space-y-0.5 shadow-[var(--shadow-soft)]">
            {nav.map((item) => <Link key={item.href} href={item.href} onClick={close} className="flex items-center min-h-11 px-2.5 rounded-lg text-sm font-medium text-[var(--color-medium-gray)] hover:bg-[var(--color-surface-2)] hover:text-[var(--color-publiora-black)] focus-visible:outline-2 focus-visible:outline-offset-2">{item.label}</Link>)}
            {!profile ? <><Link href="/login" onClick={close} className="flex items-center min-h-11 px-2.5 rounded-lg text-sm font-medium text-[var(--color-publiora-black)] focus-visible:outline-2 focus-visible:outline-offset-2">Masuk</Link><Link href="/register" onClick={close} className="flex items-center justify-center min-h-11 px-2.5 rounded-lg text-sm font-semibold text-white bg-[var(--color-publiora-black)] focus-visible:outline-2 focus-visible:outline-offset-2">Mulai gratis</Link></> : null}
          </nav>
        ) : null}
      </header>

      <main className="flex-1 min-w-0">{children}</main>
      <footer className="border-t border-[var(--color-publiora-border)] bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 flex flex-col md:flex-row gap-6 justify-between">
          <div><Logo size="sm" href="/" showText /><p className="text-sm text-[var(--color-medium-gray)] mt-1.5 max-w-xs">Buat, terbitkan, dan distribusikan ebook pemasaran dengan AI.</p></div>
          <div className="flex flex-wrap gap-x-10 gap-y-6 text-sm text-[var(--color-medium-gray)]">
            <div className="space-y-1.5"><div className="font-medium text-[var(--color-deep-gray)]">Produk</div><Link href="/#features" className="block hover:text-[var(--color-publiora-black)]">Fitur</Link><Link href="/#pricing" className="block hover:text-[var(--color-publiora-black)]">Harga</Link><Link href="/dashboard" className="block hover:text-[var(--color-publiora-black)]">{navigationId.dashboard}</Link></div>
            <div className="space-y-1.5"><div className="font-medium text-[var(--color-deep-gray)]">Coba</div><Link href="/projects/new" className="block hover:text-[var(--color-publiora-black)]">Buat ebook</Link><Link href="/register" className="block hover:text-[var(--color-publiora-black)]">Daftar gratis</Link><Link href="/login" className="block hover:text-[var(--color-publiora-black)]">Masuk</Link></div>
          </div>
        </div>
        <div className="border-t border-[var(--color-publiora-border)] px-4 sm:px-6 py-3 text-center text-xs text-[var(--color-medium-gray)]">© {new Date().getFullYear()} Publiora</div>
      </footer>
    </div>
  );
}
