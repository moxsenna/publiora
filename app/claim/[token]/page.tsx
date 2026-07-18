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

export default function ClaimRoutePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = use(params);
  const { data, isLoading } = useQuery({
    queryKey: ["claim-preview", token],
    queryFn: () =>
      apiFetch<ClaimPreview>(`/api/claim/${encodeURIComponent(token)}`),
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
