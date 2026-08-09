"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Folder,
  BookOpen,
  CreditCard,
  Package,
  Plus,
  ChevronLeft,
  X,
} from "lucide-react";
import { Logo } from "@/components/ui/Logo";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { useUiStore } from "@/store/projectStore";
import { useAuthStore } from "@/store/authStore";
import { cn } from "@/lib/utils";
import { navigationId } from "@/lib/i18n/id/navigation";

const items = [
  { href: "/dashboard", label: navigationId.dashboard, icon: LayoutDashboard },
  { href: "/projects", label: navigationId.projects, icon: Folder },
  { href: "/offers", label: navigationId.offers, icon: Package },
  { href: "/library", label: navigationId.library, icon: BookOpen },
  { href: "/settings/billing", label: navigationId.billing, icon: CreditCard },
];

function NavBody({ onNavigate, closeBtnRef }: { onNavigate?: () => void; closeBtnRef?: React.RefObject<HTMLButtonElement | null> }) {
  const pathname = usePathname();
  const profile = useAuthStore((s) => s.profile);

  return (
    <div className="w-56 flex flex-col h-full">
<div className="px-3 py-3 flex items-center justify-between">
        <Logo size="sm" href="/dashboard" />
        {onNavigate ? (
          <button
            ref={closeBtnRef}
            onClick={onNavigate}
            className="text-[var(--color-medium-gray)] hover:text-[var(--color-deep-gray)] md:hidden p-1 rounded-md"
            aria-label={navigationId.closeMenu}
          >
            <X className="h-4 w-4" />
          </button>
        ) : (
          <button
            onClick={() => useUiStore.getState().toggleSidebar()}
            className="text-[var(--color-medium-gray)] hover:text-[var(--color-deep-gray)] hidden md:inline-flex p-1 rounded-md"
            aria-label={navigationId.collapseSidebar}
          >
            <ChevronLeft className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      <div className="px-2.5 mt-1">
        <Link href="/projects/new" onClick={onNavigate}>
          <Button variant="primary" size="sm" className="w-full">
            <Plus className="h-3.5 w-3.5" />
            {navigationId.newProject}
          </Button>
        </Link>
      </div>

      <nav className="flex-1 px-2.5 mt-3 space-y-0.5" aria-label="Navigasi utama">
        {items.map((item) => {
          const active =
            pathname === item.href || pathname.startsWith(item.href + "/");
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              className={cn(
                "flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm font-medium transition-colors",
                active
                  ? "bg-[var(--color-publiora-black)] text-white"
                  : "text-[var(--color-medium-gray)] hover:bg-[var(--color-surface-2)] hover:text-[var(--color-deep-gray)]"
              )}
              {...(active ? { "aria-current": "page" } : {})}
            >
              <Icon className="h-3.5 w-3.5 shrink-0" />
              {item.label}
            </Link>
          );
        })}
      </nav>

<div className="px-2.5 pb-3 mt-auto">
        <div className="flex items-center gap-2 px-2 py-2 rounded-lg bg-[var(--color-surface-2)]">
          <Avatar
            name={profile?.name ?? navigationId.guest}
            src={profile?.avatar_url}
            size="sm"
          />
          <div className="min-w-0 flex-1">
            <div className="text-xs font-medium truncate text-[var(--color-deep-gray)]">
              {profile?.name ?? navigationId.guest}
            </div>
            <div className="text-[11px] text-[var(--color-medium-gray)] truncate">
              {profile?.email}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/** Desktop collapsible rail. */
export function Sidebar() {
  const open = useUiStore((s) => s.sidebarOpen);

  return (
    <>
      <aside
        className={cn(
          "hidden md:flex flex-col border-r border-[var(--color-publiora-border)] bg-white transition-[width] duration-200 shrink-0 h-full sticky top-0",
          open ? "w-56" : "w-12 overflow-hidden"
        )}
      >
        {open && <NavBody />}
      </aside>
      
      {/* Expand/collapse trigger outside the aside for accessibility */}
      {!open && (
        <button
          onClick={() => useUiStore.getState().toggleSidebar()}
          aria-label={navigationId.expandSidebar}
          className="hidden md:inline-flex text-[var(--color-medium-gray)] hover:text-[var(--color-deep-gray)] p-1.5 rounded-md hover:bg-[var(--color-surface-2)] absolute left-0 top-1/2 -translate-y-1/2 z-10"
        >
          <ChevronLeft className="h-3.5 w-3.5 rotate-180" />
        </button>
      )}
    </>
  );
}

/** Mobile overlay drawer. */
export function MobileSidebar() {
  const open = useUiStore((s) => s.mobileNavOpen);
  const setMobileNav = useUiStore((s) => s.setMobileNav);
  const closeBtnRef = React.useRef<HTMLButtonElement | null>(null);

  React.useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    
    // Focus on the first interactive element (close button) when opening
    closeBtnRef.current?.focus();
    
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMobileNav(false);
    };
    document.addEventListener("keydown", onKey);
    
    const onClickOutside = (e: MouseEvent) => {
      if (e.target instanceof Element && !document.getElementById("app-navigation-drawer")?.contains(e.target)) {
        setMobileNav(false);
      }
    };
    document.addEventListener("click", onClickOutside);
    
    return () => {
      document.body.style.overflow = prev;
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("click", onClickOutside);
      // Restore focus by using getElementsByTagName as a fallback
      setTimeout(() => {
        const triggers = document.querySelectorAll('[data-testid="mobile-menu-trigger"]');
        (triggers[0] as HTMLButtonElement | null)?.focus();
      }, 0);
    };
  }, [open, setMobileNav]);

  if (!open) return null;

  return (
    <div
      id="app-navigation-drawer"
      className="fixed inset-0 z-50 md:hidden"
      role="dialog"
      aria-modal="true"
      aria-label="Navigasi utama"
    >
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-fade-in"
        onClick={() => setMobileNav(false)}
        data-testid="mobile-navigation-backdrop"
        aria-hidden="true"
      />
      <aside
        className="absolute left-0 top-0 bottom-0 w-56 bg-white shadow-[var(--shadow-pop)] animate-slide-in-left border-r border-[var(--color-publiora-border)]"
        role="navigation"
        aria-label="Navigasi utama"
      >
        <NavBody onNavigate={() => setMobileNav(false)} closeBtnRef={closeBtnRef} />
      </aside>
    </div>
  );
}
