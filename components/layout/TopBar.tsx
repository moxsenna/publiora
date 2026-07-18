"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Menu, LogOut, CreditCard, BookOpen, PanelLeft } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Avatar } from "@/components/ui/Avatar";
import { Dropdown } from "@/components/ui/Dropdown";
import { useUiStore } from "@/store/projectStore";
import { useAuthStore } from "@/store/authStore";

export function TopBar({ title }: { title?: string }) {
  const toggleSidebar = useUiStore((s) => s.toggleSidebar);
  const toggleMobileNav = useUiStore((s) => s.toggleMobileNav);
  const profile = useAuthStore((s) => s.profile);
  const signOut = useAuthStore((s) => s.signOut);
  const router = useRouter();

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
        aria-label="Open menu"
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

      {title && (
        <h1 className="text-sm font-semibold text-[var(--color-publiora-black)] truncate">
          {title}
        </h1>
      )}

      <div className="ml-auto flex items-center gap-1.5">
        <Link href="/library" className="hidden sm:block">
          <Button variant="ghost" size="sm">
            <BookOpen className="h-3.5 w-3.5" />
            Library
          </Button>
        </Link>
        <Dropdown
          aria-label="Menu akun"
          trigger={
            <div className="inline-flex items-center gap-2 px-1 py-0.5 rounded-full hover:bg-[var(--color-surface-2)] transition-colors">
              <Avatar
                name={profile?.name ?? "Guest"}
                src={profile?.avatar_url}
                size="sm"
              />
            </div>
          }
          items={[
            {
              label: "Billing",
              icon: <CreditCard className="h-4 w-4" />,
              onClick: () => router.push("/settings/billing"),
            },
            {
              label: "Library",
              icon: <BookOpen className="h-4 w-4" />,
              onClick: () => router.push("/library"),
            },
            "divider",
            {
              label: "Sign out",
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
