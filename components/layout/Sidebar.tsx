"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Folder, BookOpen, CreditCard, Package, Plus, ChevronLeft, X } from "lucide-react";
import { Logo } from "@/components/ui/Logo";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { useUiStore } from "@/store/projectStore";
import { useAuthStore } from "@/store/authStore";
import { navigationId } from "@/lib/i18n/id/navigation";
import { cn } from "@/lib/utils";

export const APP_NAV_DRAWER_ID = "app-navigation-drawer";
export const APP_NAV_TRIGGER_ID = "app-navigation-trigger";
const focusableSelector = 'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])';

const items = [
  { href: "/dashboard", label: navigationId.dashboard, icon: LayoutDashboard },
  { href: "/projects", label: navigationId.projects, icon: Folder },
  { href: "/offers", label: navigationId.offers, icon: Package },
  { href: "/library", label: navigationId.library, icon: BookOpen },
  { href: "/settings/billing", label: navigationId.billing, icon: CreditCard },
] as const;

function NavBody({ onNavigate, mobile = false }: { onNavigate?: () => void; mobile?: boolean }) {
  const pathname = usePathname();
  const profile = useAuthStore((s) => s.profile);

  return (
    <div className="w-64 sm:w-60 flex flex-col h-full max-w-[85vw]">
      <div className="px-3 py-3 flex items-center justify-between">
        <Logo size="sm" href="/dashboard" />
        {mobile ? (
          <button type="button" onClick={onNavigate} className="text-[var(--color-medium-gray)] hover:text-[var(--color-deep-gray)] md:hidden min-h-11 min-w-11 grid place-items-center rounded-lg focus-visible:outline-2 focus-visible:outline-offset-2" aria-label={navigationId.closeMenu}>
            <X aria-hidden="true" className="h-4 w-4" />
          </button>
        ) : (
          <button type="button" onClick={() => useUiStore.getState().toggleSidebar()} className="text-[var(--color-medium-gray)] hover:text-[var(--color-deep-gray)] hidden md:grid min-h-9 min-w-9 place-items-center rounded-lg focus-visible:outline-2 focus-visible:outline-offset-2" aria-label={navigationId.collapseSidebar}>
            <ChevronLeft aria-hidden="true" className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      <div className="px-2.5 mt-1">
        <Link href="/projects/new" onClick={onNavigate} className="block rounded-lg focus-visible:outline-2 focus-visible:outline-offset-2">
          <Button variant="primary" size="sm" className="w-full min-h-11 sm:min-h-9"><Plus aria-hidden="true" className="h-3.5 w-3.5" />{navigationId.newProject}</Button>
        </Link>
      </div>

      <nav aria-label="Navigasi utama" className="flex-1 px-2.5 mt-3 space-y-0.5">
        {items.map((item) => {
          const active = pathname === item.href || pathname.startsWith(item.href + "/");
          const Icon = item.icon;
          return (
            <Link key={item.href} href={item.href} onClick={onNavigate} aria-current={active ? "page" : undefined} className={cn("flex items-center gap-2.5 px-2.5 min-h-11 sm:min-h-10 rounded-lg text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2", active ? "bg-[var(--color-publiora-black)] text-white" : "text-[var(--color-medium-gray)] hover:bg-[var(--color-surface-2)] hover:text-[var(--color-deep-gray)]")}>
              <Icon aria-hidden="true" className="h-3.5 w-3.5 shrink-0" />{item.label}
            </Link>
          );
        })}
      </nav>

      <div className="px-2.5 pb-3 mt-auto">
        <div className="flex items-center gap-2 px-2 py-2 rounded-lg bg-[var(--color-surface-2)]">
          <Avatar name={profile?.name ?? navigationId.guest} src={profile?.avatar_url} size="sm" />
          <div className="min-w-0 flex-1">
            <div className="text-xs font-medium truncate text-[var(--color-deep-gray)]">{profile?.name ?? navigationId.guest}</div>
            <div className="text-[11px] text-[var(--color-medium-gray)] truncate">{profile?.email}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function Sidebar() {
  const open = useUiStore((s) => s.sidebarOpen);
  return <aside className={cn("hidden md:flex flex-col border-r border-[var(--color-publiora-border)] bg-white transition-[width] duration-200 shrink-0 h-full sticky top-0", open ? "w-60" : "w-0 overflow-hidden")}>{open ? <NavBody /> : null}</aside>;
}

export function MobileSidebar() {
  const open = useUiStore((s) => s.mobileNavOpen);
  const setMobileNav = useUiStore((s) => s.setMobileNav);
  const panelRef = React.useRef<HTMLElement>(null);
  const closeRef = React.useRef(setMobileNav);
  React.useEffect(() => {
    closeRef.current = setMobileNav;
  }, [setMobileNav]);

  React.useEffect(() => {
    if (!open) return;
    const panel = panelRef.current;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const timer = window.setTimeout(() => (panel?.querySelector<HTMLElement>(focusableSelector) ?? panel)?.focus(), 0);
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") { event.preventDefault(); closeRef.current(false); return; }
      if (event.key !== "Tab" || !panel) return;
      const nodes = Array.from(panel.querySelectorAll<HTMLElement>(focusableSelector)).filter((node) => node.tabIndex !== -1);
      if (!nodes.length) { event.preventDefault(); panel.focus(); return; }
      const first = nodes[0];
      const last = nodes[nodes.length - 1];
      if (event.shiftKey && (document.activeElement === first || !panel.contains(document.activeElement))) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && (document.activeElement === last || !panel.contains(document.activeElement))) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      window.clearTimeout(timer);
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previousOverflow;
      document.getElementById(APP_NAV_TRIGGER_ID)?.focus();
    };
  }, [open]);

  if (!open) return null;
  const close = () => setMobileNav(false);
  return (
    <div className="fixed inset-0 z-50 md:hidden overscroll-contain">
      <div data-testid="mobile-navigation-backdrop" aria-hidden="true" className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-fade-in" onClick={close} />
      <aside ref={panelRef} id={APP_NAV_DRAWER_ID} role="dialog" aria-modal="true" aria-label="Navigasi utama" tabIndex={-1} className="absolute left-0 top-0 bottom-0 max-h-dvh bg-white shadow-[var(--shadow-pop)] animate-slide-in-left border-r border-[var(--color-publiora-border)] outline-none">
        <NavBody mobile onNavigate={close} />
      </aside>
    </div>
  );
}
