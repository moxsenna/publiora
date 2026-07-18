"use client";

import Link from "next/link";
import { useLibrary, useReadingProgress } from "@/lib/api/hooks";
import { Card, CardBody } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { BookOpen, ArrowRight } from "lucide-react";
import { formatRelativeTime } from "@/lib/utils";

export default function LibraryPage() {
  const { data: library, isLoading: libLoading } = useLibrary();
  const { data: progress } = useReadingProgress();

  const progressMap = new Map((progress ?? []).map((p) => [p.ebook_id, p]));

  // Sort: continue-reading first by last_read_at
  const items = [...(library ?? [])].sort((a, b) => {
    const pa = progressMap.get(a.ebook_id)?.last_read_at ?? a.created_at;
    const pb = progressMap.get(b.ebook_id)?.last_read_at ?? b.created_at;
    return pb.localeCompare(pa);
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-[var(--color-publiora-black)]">Library</h1>
        <p className="text-[var(--color-medium-gray)] mt-1">
          Ebook yang sudah Anda klaim. Akses kapan saja.
          {!libLoading && library ? ` · ${library.length} ebook` : ""}
        </p>
      </div>

      {libLoading ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-48" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <Card>
          <EmptyState
            icon={<BookOpen className="h-6 w-6" />}
            title="Library kosong"
            description="Klaim ebook lewat claim link untuk menambahkannya."
            action={
              <Link href="/dashboard">
                <Button size="sm">Ke dashboard</Button>
              </Link>
            }
          />
        </Card>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
          {items.map((e) => {
            const p = progressMap.get(e.ebook_id);
            return (
              <Link key={e.id} href={`/read/${e.ebook_slug}`}>
                <Card className="hover:shadow-[var(--shadow-card-hover)] hover:-translate-y-0.5 transition-all cursor-pointer h-full">
                  <div
                    className="h-32 rounded-t-[var(--radius-card)] flex items-end p-4"
                    style={{ background: e.cover_color }}
                  >
                    <h3 className="text-white font-semibold text-base line-clamp-3 drop-shadow">
                      {e.ebook_title}
                    </h3>
                  </div>
                  <CardBody>
                    <div className="text-xs text-[var(--color-soft-gray)]">
                      by {e.author}
                    </div>
                    {p ? (
                      <div className="mt-3">
                        <div className="flex items-center justify-between text-xs text-[var(--color-medium-gray)]">
                          <span>
                            {p.progress >= 100
                              ? "Selesai"
                              : `${p.progress}% selesai`}
                          </span>
                          <span>
                            Section {p.current_section}/{p.total_sections}
                          </span>
                        </div>
                        <ProgressBar
                          value={p.progress}
                          className="mt-1.5"
                          barClassName={
                            p.progress >= 100
                              ? "bg-[var(--color-success)]"
                              : "bg-[var(--color-publiora-blue)]"
                          }
                        />
                        <div className="mt-2 text-[10px] text-[var(--color-soft-gray)]">
                          Dibaca {formatRelativeTime(p.last_read_at)}
                        </div>
                      </div>
                    ) : (
                      <div className="mt-3 text-xs text-[var(--color-soft-gray)]">
                        Belum dibaca
                      </div>
                    )}
                    <div className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-[var(--color-publiora-blue)]">
                      {p && p.progress > 0 && p.progress < 100
                        ? "Lanjutkan"
                        : "Baca"}{" "}
                      <ArrowRight className="h-3 w-3" />
                    </div>
                  </CardBody>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
