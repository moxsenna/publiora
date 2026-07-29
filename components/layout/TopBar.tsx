"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Menu, LogOut, CreditCard, BookOpen, PanelLeft } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Avatar } from "@/components/ui/Avatar";
import { Dropdown } from "@/components/ui/Dropdown";
import { useUiStore } from "@/store/projectStore";
import { useAuthStore } from "@/store/authStore";
import { navigationId } from "@/lib/i18n/id/navigation";
import { APP_NAV_DRAWER_ID, APP_NAV_TRIGGER_ID } from "./Sidebar";

const pathnameTitles = [
  { path: "/settings/billing", title: navigationId.billing },
  { path: "/dashboard", title: navigationId.dashboard },
  { path: "/projects", title: navigationId.projects },
  { path: "/offers", title: navigationId.offers },
  { path: "/library", title: navigationId.library },
] as const satisfies readonly { path: `/${string}`; title: string }[];

function titleForPathname(pathname: string): string | undefined {
  return pathnameTitles.find(({ path }) => pathname === path || pathname.startsWith(`${path}/`))?.title;
}

export function TopBar({ title }: { title?: string }) {
  const pathname = usePathname();
  const sidebarOpen = useUiStore((s) => s.sidebarOpen);
  const mobileNavOpen = useUiStore((s) => s.mobileNavOpen);
  const toggleSidebar = useUiStore((s) => s.toggleSidebar);
  const toggleMobileNav = useUiStore((s) => s.toggleMobileNav);
  const profile = useAuthStore((s) => s.profile);
  const signOut = useAuthStore((s) => s.signOut);
  const router = useRouter();
  const resolvedTitle = title ?? titleForPathname(pathname);

  const onSignOut = async () => { await signOut(); router.replace("/"); };

  return (
    <header className="h-14 sm:h-12 border-b border-[var(--color-publiora-border)] bg-white/90 backdrop-blur supports-[backdrop-filter]:bg-white/80 flex items-center gap-2 px-3 sm:px-4 sticky top-0 z-30 min-w-0">
      <button id={APP_NAV_TRIGGER_ID} type="button" onClick={toggleMobileNav} className="md:hidden text-[var(--color-medium-gray)] hover:text-[var(--color-deep-gray)] min-h-11 min-w-11 grid place-items-center rounded-lg hover:bg-[var(--color-surface-2)] focus-visible:outline-2 focus-visible:outline-offset-2" aria-label={mobileNavOpen ? navigationId.closeMenu : navigationId.openMenu} aria-expanded={mobileNavOpen} aria-controls={APP_NAV_DRAWER_ID}>
        <Menu aria-hidden="true" className="h-4 w-4" />
      </button>

      <button type="button" onClick={toggleSidebar} className="hidden md:grid text-[var(--color-medium-gray)] hover:text-[var(--color-deep-gray)] min-h-9 min-w-9 place-items-center rounded-lg hover:bg-[var(--color-surface-2)] focus-visible:outline-2 focus-visible:outline-offset-2" aria-label={sidebarOpen ? navigationId.collapseSidebar : navigationId.expandSidebar}>
        <PanelLeft aria-hidden="true" className="h-4 w-4" />
      </button>

      {resolvedTitle ? <h1 className="text-sm font-semibold text-[var(--color-publiora-black)] truncate">{resolvedTitle}</h1> : null}

      <div className="ml-auto flex items-center gap-1.5">
        <Link href="/library" className="hidden sm:block rounded-lg focus-visible:outline-2 focus-visible:outline-offset-2"><Button variant="ghost" size="sm"><BookOpen aria-hidden="true" className="h-3.5 w-3.5" />{navigationId.library}</Button></Link>
        <Dropdown aria-label="Menu akun" trigger={<div className="inline-flex items-center gap-2 min-h-11 min-w-11 sm:min-h-9 sm:min-w-9 justify-center rounded-full hover:bg-[var(--color-surface-2)] transition-colors"><Avatar name={profile?.name ?? navigationId.guest} src={profile?.avatar_url} size="sm" /></div>} items={[
          { label: navigationId.billing, icon: <CreditCard className="h-4 w-4" />, onClick: () => router.push("/settings/billing") },
          { label: navigationId.library, icon: <BookOpen className="h-4 w-4" />, onClick: () => router.push("/library") },
          "divider",
          { label: navigationId.signOut, icon: <LogOut className="h-4 w-4" />, onClick: onSignOut, danger: true },
        ]} />
      </div>
    </header>
  );
}
