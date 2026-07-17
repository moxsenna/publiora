"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Sidebar, MobileSidebar } from "./Sidebar";
import { TopBar } from "./TopBar";
import { useAuthStore } from "@/store/authStore";

interface AppShellProps {
  title?: string;
  children: React.ReactNode;
}

export function AppShell({ title, children }: AppShellProps) {
  const profile = useAuthStore((s) => s.profile);
  const initialized = useAuthStore((s) => s.initialized);
  const router = useRouter();

  React.useEffect(() => {
    if (initialized && !profile) {
      router.replace("/login");
    }
  }, [initialized, profile, router]);

  if (!initialized) {
    return (
      <div className="flex-1 grid place-items-center min-h-[50vh]">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 rounded-full border-2 border-[var(--color-publiora-blue)] border-t-transparent animate-spin" />
          <div className="text-[var(--color-soft-gray)] text-sm">Memuat…</div>
        </div>
      </div>
    );
  }
  if (!profile) return null;

  return (
    <div className="flex flex-1 min-h-screen">
      <Sidebar />
      <MobileSidebar />
      <div className="flex flex-col flex-1 min-w-0 min-h-0">
        <TopBar title={title} />
        <main className="flex-1 min-h-0 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
