"use client";

import { use } from "react";
import { useQuery } from "@tanstack/react-query";
import * as api from "@/lib/mock/api";
import { ClaimPage } from "@/components/claim/ClaimPage";
import { Skeleton } from "@/components/ui/Skeleton";
import type { PublishedEbook } from "@/types";

export default function ClaimRoutePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = use(params);
  const { data, isLoading } = useQuery({
    queryKey: ["claim-preview", token],
    queryFn: async () => {
      // Peek claim link + ebook without consuming the claim.
      const db = await import("@/lib/mock/db").then((m) => m.getDb());
      const link = db.claimLinks.find((l) => l.token === token.toUpperCase());
      if (!link) return { status: "not_found" as const };
      if (link.status === "revoked") return { status: "revoked" as const };
      if (
        link.status === "expired" ||
        (link.expires_at && new Date(link.expires_at).getTime() < Date.now())
      ) {
        return { status: "expired" as const };
      }
      if (link.max_uses != null && link.used_count >= link.max_uses) {
        return { status: "limit_reached" as const };
      }
      try {
        const ebook: PublishedEbook = await api.getPublishedEbook(link.ebook_id);
        return { status: "ready" as const, ebook, token: link.token };
      } catch {
        return { status: "not_found" as const };
      }
    },
  });

  if (isLoading || !data) {
    return (
      <div className="min-h-full grid place-items-center px-6">
        <Skeleton className="h-80 w-full max-w-md" />
      </div>
    );
  }

  return <ClaimPage token={token} preview={data} />;
}
