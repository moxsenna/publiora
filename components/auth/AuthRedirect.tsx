"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/authStore";

/** Redirect authenticated users away from auth pages. */
export function AuthRedirect({ to = "/dashboard" }: { to?: string }) {
  const profile = useAuthStore((s) => s.profile);
  const initialized = useAuthStore((s) => s.initialized);
  const router = useRouter();

  React.useEffect(() => {
    if (initialized && profile) {
      router.replace(to);
    }
  }, [initialized, profile, router, to]);

  return null;
}
