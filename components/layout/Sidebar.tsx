"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Folder,
  BookOpen,
  CreditCard,
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

const items = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/projects", label: "Projects", icon: Folder },
  { href: "/library", label: "Library", icon: BookOpen },
  { href: "/settings/billing", label: "Billing", icon: CreditCard },
];

function NavBody({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const profile = useAuthStore((s) => s.profile);

  return (
    <div className="w-64 flex flex-col h-full">
      <div className="px-5 py-5 flex items-center justify-between">
        <Logo size="sm" href="/dashboard" />
        {onNavigate ? (
          <button
            onClick={onNavigate}
            className="text-[var(--color-medium-gray)] hover:text-[var(--color-deep-gray)] md:hidden"
            aria-label="Close menu"
          >
            <X className="h-5 w-5" />
          </button>
        ) : (
          <button
            onClick={() => useUiStore.getState().toggleSidebar()}
            className="text-[var(--color-medium-gray)] hover:text-[var(--color-deep-gray)] hidden md:inline-flex"
            aria-label="Collapse sidebar"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
        )}
      </div>

      <div className="px-3 mt-2">
        <Link href="/projects/new" onClick={onNavigate}>
          <Button variant="primary" size="sm" className="w-full">
            <Plus className="h-4 w-4" />
            New Project
          </Button>
        </Link>
      </div>

      <nav className="flex-1 px-3 mt-5 space-y-1">
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
                "flex items-center gap-3 px-3 py-2.5 rounded-[12px] text-sm font-medium transition-colors",
                active
                  ? "bg-[var(--color-publiora-black)] text-white"
                  : "text-[var(--color-medium-gray)] hover:bg-[var(--color-surface-2)] hover:text-[var(--color-deep-gray)]"
              )}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="px-3 pb-4 mt-auto">
        <div className="flex items-center gap-3 px-3 py-3 rounded-[12px] bg-[var(--color-surface-2)]">
          <Avatar
            name={profile?.name ?? "Guest"}
            src={profile?.avatar_url}
            size="sm"
          />
          <div className="min-w-0 flex-1">
            <div className="text-sm font-medium truncate text-[var(--color-deep-gray)]">
              {profile?.name ?? "Guest"}
            </div>
            <div className="text-xs text-[var(--color-medium-gray)] truncate">
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
    <aside
      className={cn(
        "hidden md:flex flex-col border-r border-[var(--color-publiora-border)] bg-white transition-[width] duration-200 shrink-0 h-full sticky top-0",
        open ? "w-64" : "w-0 overflow-hidden"
      )}
    >
      <NavBody />
    </aside>
  );
}

/** Mobile overlay drawer. */
export function MobileSidebar() {
  const open = useUiStore((s) => s.mobileNavOpen);
  const setMobileNav = useUiStore((s) => s.setMobileNav);

  React.useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMobileNav(false);
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      document.removeEventListener("keydown", onKey);
    };
  }, [open, setMobileNav]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 md:hidden">
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-fade-in"
        onClick={() => setMobileNav(false)}
      />
      <aside className="absolute left-0 top-0 bottom-0 w-64 bg-white shadow-[var(--shadow-pop)] animate-slide-in-left border-r border-[var(--color-publiora-border)]">
        <NavBody onNavigate={() => setMobileNav(false)} />
      </aside>
    </div>
  );
}
