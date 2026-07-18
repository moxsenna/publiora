"use client";

import { use } from "react";
import { useQuery } from "@tanstack/react-query";
import { ClaimPage } from "@/components/claim/ClaimPage";
import { Skeleton } from "@/components/ui/Skeleton";
import type { PublishedEbook } from "@/types";
import { apiFetch } from "@/lib/api/client";

type ClaimPreview =
  | { status: "ready"; ebook: PublishedEbook; token: string }
  | { status: "expired" }
  | { status: "revoked" }
  | { status: "limit_reached" }
  | { status: "not_found" };

function shouldUseMock() {
  return process.env.NEXT_PUBLIC_USE_MOCK_API !== "false";
}

export default function ClaimRoutePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = use(params);
  const { data, isLoading } = useQuery({
    queryKey: ["claim-preview", token],
    queryFn: async (): Promise<ClaimPreview> => {
      if (shouldUseMock()) {
        const api = await import("@/lib/mock/api");
        const db = await import("@/lib/mock/db").then((m) => m.getDb());
        const link = db.claimLinks.find((l) => l.token === token.toUpperCase());
        if (!link) return { status: "not_found" };
        if (link.status === "revoked") return { status: "revoked" };
        if (
          link.status === "expired" ||
          (link.expires_at && new Date(link.expires_at).getTime() < Date.now())
        ) {
          return { status: "expired" };
        }
        if (link.max_uses != null && link.used_count >= link.max_uses) {
          return { status: "limit_reached" };
        }
        try {
          const ebook: PublishedEbook = await api.getPublishedEbook(link.ebook_id);
          return { status: "ready", ebook, token: link.token };
        } catch {
          return { status: "not_found" };
        }
      }

      return apiFetch<ClaimPreview>(`/api/claim/${encodeURIComponent(token)}`);
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
