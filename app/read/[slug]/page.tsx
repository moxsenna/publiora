"use client";

import * as React from "react";
import { use } from "react";
import Link from "next/link";
import { usePublishedBySlug } from "@/lib/api/hooks";
import { Reader } from "@/components/reader/Reader";
import { Skeleton } from "@/components/ui/Skeleton";
import { Button } from "@/components/ui/Button";
import { BookOpen } from "lucide-react";

export default function ReadPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = use(params);
  const { data: ebook, isLoading, isError } = usePublishedBySlug(slug);

  if (isLoading) {
    return (
      <div className="max-w-3xl mx-auto px-6 py-16 space-y-4">
        <Skeleton className="h-48" />
        <Skeleton className="h-8 w-2/3" />
        <Skeleton className="h-40" />
      </div>
    );
  }

  if (isError || !ebook) {
    return (
      <div className="min-h-full grid place-items-center px-6">
        <div className="text-center max-w-md">
          <div className="h-14 w-14 rounded-2xl bg-[var(--color-surface-2)] grid place-items-center mx-auto text-[var(--color-medium-gray)]">
            <BookOpen className="h-6 w-6" />
          </div>
          <h1 className="mt-4 text-xl font-bold text-[var(--color-publiora-black)]">
            Ebook tidak ditemukan
          </h1>
          <p className="mt-2 text-sm text-[var(--color-medium-gray)]">
            Link mungkin salah, atau ebook belum dipublish.
          </p>
          <Link href="/library" className="inline-block mt-6">
            <Button>Ke library</Button>
          </Link>
        </div>
      </div>
    );
  }

  return <Reader ebook={ebook} />;
}
