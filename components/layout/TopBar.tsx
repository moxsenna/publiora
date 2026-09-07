"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { Menu, LogOut, CreditCard, BookOpen, PanelLeft } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Avatar } from "@/components/ui/Avatar";
import { Dropdown } from "@/components/ui/Dropdown";
import { useUiStore } from "@/store/projectStore";
import { useAuthStore } from "@/store/authStore";
import { navigationId } from "@/lib/i18n/id/navigation";

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export function TopBar({ title }: { title?: string }) {
  const toggleSidebar = useUiStore((s) => s.toggleSidebar);
  const toggleMobileNav = useUiStore((s) => s.toggleMobileNav);
  const profile = useAuthStore((s) => s.profile);
  const signOut = useAuthStore((s) => s.signOut);
  const router = useRouter();
  const pathname = usePathname();

  const pageLabel = React.useMemo(() => {
    if (title) return title; // explicit wins
    const routes: Record<string, string> = {
      "/dashboard": navigationId.dashboard,
      "/projects": navigationId.projects,
      "/projects/new": navigationId.newProject,
      "/offers": navigationId.offers,
      "/library": navigationId.library,
      "/settings/billing": navigationId.billing,
    };
    for (const [route, label] of Object.entries(routes)) {
      if (pathname === route || pathname.startsWith(route + "/")) return label;
    }
    // fallback to safe segment name — never show raw secret slug
    const lastSegment = pathname.split("/").filter(Boolean).pop() ?? "";
    if (!lastSegment) return "Publiora";
    return capitalize(lastSegment);
  }, [pathname, title]);

  const onSignOut = async () => {
    await signOut();
    router.replace("/");
  };

  return (
    <header className="h-12 border-b border-[var(--color-publiora-border)] bg-white/90 backdrop-blur supports-[backdrop-filter]:bg-white/80 flex items-center gap-2 px-3 sm:px-4 sticky top-0 z-30">
      {/* Mobile menu */}
      <button
        onClick={toggleMobileNav}
        className="md:hidden text-[var(--color-medium-gray)] hover:text-[var(--color-deep-gray)] p-1.5 rounded-md hover:bg-[var(--color-surface-2)]"
        aria-label={navigationId.openMenu}
        data-testid="mobile-menu-trigger"
        role="button"
        aria-controls="app-navigation-drawer"
        aria-expanded={useUiStore((s) => s.mobileNavOpen)}
      >
        <Menu className="h-4 w-4" />
      </button>

      {/* Desktop collapse */}
      <button
        onClick={toggleSidebar}
        className="hidden md:inline-flex text-[var(--color-medium-gray)] hover:text-[var(--color-deep-gray)] p-1.5 rounded-md hover:bg-[var(--color-surface-2)]"
        aria-label="Toggle sidebar"
      >
        <PanelLeft className="h-4 w-4" />
      </button>

      <h1 className="text-sm font-semibold text-[var(--color-publiora-black)] truncate">
        {pageLabel}
      </h1>

      <div className="ml-auto flex items-center gap-1.5">
        <Link href="/library" className="hidden sm:block">
          <Button variant="ghost" size="sm">
            <BookOpen className="h-3.5 w-3.5" />
            {navigationId.library}
          </Button>
        </Link>
        <Dropdown
          aria-label="Menu akun"
          trigger={
            <div className="inline-flex items-center gap-2 px-1 py-0.5 rounded-full hover:bg-[var(--color-surface-2)] transition-colors">
              <Avatar
                name={profile?.name ?? navigationId.guest}
                src={profile?.avatar_url}
                size="sm"
              />
            </div>
          }
          items={[
            {
              label: navigationId.billing,
              icon: <CreditCard className="h-4 w-4" />,
              onClick: () => router.push("/settings/billing"),
            },
            {
              label: navigationId.library,
              icon: <BookOpen className="h-4 w-4" />,
              onClick: () => router.push("/library"),
            },
            "divider",
            {
              label: navigationId.signOut,
              icon: <LogOut className="h-4 w-4" />,
              onClick: onSignOut,
              danger: true,
            },
          ]}
        />
      </div>
    </header>
  );
}
