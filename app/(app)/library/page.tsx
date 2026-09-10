"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useLibrary, useReadingProgress } from "@/lib/api/hooks";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { BookCover } from "@/components/books/BookCover";
import {
  BookOpen,
  ArrowRight,
  Search,
  X,
  Sparkles,
  CheckCircle2,
  Clock,
  Bookmark,
} from "lucide-react";
import { formatRelativeTime } from "@/lib/utils";
import { libraryId, getReadingStateCopy } from "@/lib/i18n/id/library";

type ReadingFilter = "all" | "in_progress" | "completed" | "unread";

export default function LibraryPage() {
  const { data: library, isLoading: libLoading } = useLibrary();
  const { data: progress } = useReadingProgress();
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<ReadingFilter>("all");

  const progressMap = useMemo(() => {
    return new Map((progress ?? []).map((p) => [p.ebook_id, p]));
  }, [progress]);

  // Sort: continue-reading first by last_read_at
  const allItems = useMemo(() => {
    return [...(library ?? [])].sort((a, b) => {
      const pa = progressMap.get(a.ebook_id)?.last_read_at ?? a.created_at;
      const pb = progressMap.get(b.ebook_id)?.last_read_at ?? b.created_at;
      return pb.localeCompare(pa);
    });
  }, [library, progressMap]);

  // Reading status counts
  const counts = useMemo(() => {
    let inProgress = 0;
    let completed = 0;
    let unread = 0;

    for (const item of allItems) {
      const p = progressMap.get(item.ebook_id);
      if (!p || p.progress === 0) {
        unread++;
      } else if (p.progress >= 100) {
        completed++;
      } else {
        inProgress++;
      }
    }

    return {
      all: allItems.length,
      in_progress: inProgress,
      completed,
      unread,
    };
  }, [allItems, progressMap]);

  // Most active reading book for the Hero Spotlight Shelf
  const spotlightBook = useMemo(() => {
    if (allItems.length === 0) return null;
    // Look for book currently in progress
    const active = allItems.find((item) => {
      const p = progressMap.get(item.ebook_id);
      return p && p.progress > 0 && p.progress < 100;
    });
    // If none in progress, return the most recently read/accessed book
    return active ?? allItems[0];
  }, [allItems, progressMap]);

  const spotlightProgress = spotlightBook
    ? progressMap.get(spotlightBook.ebook_id)
    : null;

  // Filtered collection list
  const filtered = useMemo(() => {
    return allItems.filter((e) => {
      const p = progressMap.get(e.ebook_id);
      const isCompleted = p && p.progress >= 100;
      const isInProgress = p && p.progress > 0 && p.progress < 100;
      const isUnread = !p || p.progress === 0;

      if (filter === "in_progress" && !isInProgress) return false;
      if (filter === "completed" && !isCompleted) return false;
      if (filter === "unread" && !isUnread) return false;

      if (q.trim()) {
        const query = q.toLowerCase();
        const hay = `${e.ebook_title} ${e.author}`.toLowerCase();
        return hay.includes(query);
      }
      return true;
    });
  }, [allItems, progressMap, filter, q]);

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-5 py-6 space-y-7">
      {/* Top Title & Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[var(--color-publiora-black)]">
            {libraryId.title} Pribadi
          </h1>
          <p className="text-sm text-[var(--color-medium-gray)] mt-1">
            {libraryId.description}
            {!libLoading && library ? ` · ${library.length} ebook terdaftar` : ""}
          </p>
        </div>
      </div>

      {libLoading ? (
        <div className="space-y-6">
          <Skeleton className="h-64 w-full rounded-2xl" />
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-72 rounded-xl" />
            ))}
          </div>
        </div>
      ) : allItems.length === 0 ? (
        <Card>
          <EmptyState
            icon={<BookOpen className="h-8 w-8 text-[var(--color-medium-gray)]" />}
            title={libraryId.emptyTitle}
            description={libraryId.emptyDescription}
            action={
              <Link href="/dashboard">
                <Button size="sm">{libraryId.dashboard}</Button>
              </Link>
            }
          />
        </Card>
      ) : (
        <>
          {/* Spotlight Hero Shelf: "Lanjutkan Membaca" */}
          {spotlightBook && !q && filter === "all" && (
            <div className="relative overflow-hidden rounded-2xl border border-[var(--color-publiora-border)] bg-gradient-to-br from-white via-white to-[var(--color-surface-2)] p-5 sm:p-7 shadow-xs">
              <div className="flex flex-col sm:flex-row items-center sm:items-stretch gap-6">
                {/* 3D Book Cover Visual */}
                <Link
                  href={`/read/${spotlightBook.ebook_slug}`}
                  className="group/spotlight shrink-0 focus-visible:outline-none"
                >
                  <BookCover
                    id={spotlightBook.ebook_id}
                    title={spotlightBook.ebook_title}
                    author={spotlightBook.author}
                    coverColor={spotlightBook.cover_color}
                    size="md"
                    className="group-hover/spotlight:scale-105 group-hover/spotlight:-rotate-1 transition-all duration-300 shadow-xl"
                  />
                </Link>

                {/* Book Details & Continue Progress */}
                <div className="flex-1 min-w-0 flex flex-col justify-between text-center sm:text-left space-y-4">
                  <div>
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[var(--color-publiora-blue)]/10 text-[var(--color-publiora-blue)] text-xs font-semibold">
                      <Sparkles className="h-3.5 w-3.5" />
                      {spotlightProgress && spotlightProgress.progress > 0 && spotlightProgress.progress < 100
                        ? "Lanjutkan Membaca"
                        : spotlightProgress && spotlightProgress.progress >= 100
                          ? "Selesai Dibaca"
                          : "Siap Dibaca"}
                    </div>

                    <Link
                      href={`/read/${spotlightBook.ebook_slug}`}
                      className="block mt-2.5 group/title focus-visible:outline-none"
                    >
                      <h2 className="text-xl sm:text-2xl font-bold text-[var(--color-publiora-black)] group-hover/title:text-[var(--color-publiora-blue)] transition-colors line-clamp-2">
                        {spotlightBook.ebook_title}
                      </h2>
                    </Link>

                    <p className="text-sm text-[var(--color-medium-gray)] mt-1 font-medium">
                      Oleh {spotlightBook.author}
                    </p>
                  </div>

                  {/* Reading Status & Bar */}
                  <div className="space-y-2 max-w-md mx-auto sm:mx-0 w-full">
                    {spotlightProgress ? (
                      <div>
                        <div className="flex items-center justify-between text-xs text-[var(--color-medium-gray)] font-medium">
                          <span>
                            {spotlightProgress.progress >= 100
                              ? "100% Selesai"
                              : `${spotlightProgress.progress}% selesai`}
                          </span>
                          <span>
                            Bagian {spotlightProgress.current_section} dari{" "}
                            {spotlightProgress.total_sections}
                          </span>
                        </div>
                        <ProgressBar
                          value={spotlightProgress.progress}
                          className="mt-1.5 h-2"
                          barClassName={
                            spotlightProgress.progress >= 100
                              ? "bg-[var(--color-success)]"
                              : "bg-[var(--color-publiora-blue)]"
                          }
                        />
                        <p className="text-[11px] text-[var(--color-soft-gray)] mt-1.5 flex items-center justify-center sm:justify-start gap-1">
                          <Clock className="h-3 w-3" />
                          Terakhir dibaca {formatRelativeTime(spotlightProgress.last_read_at)}
                        </p>
                      </div>
                    ) : (
                      <p className="text-xs text-[var(--color-medium-gray)]">
                        Belum ada progres baca. Klik tombol untuk mulai membuka bab pertama.
                      </p>
                    )}
                  </div>

                  {/* Call to Action Button */}
                  <div className="pt-1">
                    <Link href={`/read/${spotlightBook.ebook_slug}`}>
                      <Button size="md" className="w-full sm:w-auto shadow-sm gap-2">
                        {spotlightProgress && spotlightProgress.progress > 0 && spotlightProgress.progress < 100
                          ? libraryId.continue
                          : libraryId.read}
                        <ArrowRight className="h-4 w-4" />
                      </Button>
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Search and Category Filter Tabs */}
          <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between pt-1">
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar w-full sm:w-auto pb-1 sm:pb-0">
              <button
                type="button"
                onClick={() => setFilter("all")}
                className={
                  "px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap border transition-all inline-flex items-center gap-1.5 " +
                  (filter === "all"
                    ? "bg-[var(--color-publiora-black)] text-white border-[var(--color-publiora-black)] shadow-xs"
                    : "bg-white text-[var(--color-medium-gray)] border-[var(--color-publiora-border)] hover:bg-[var(--color-surface-2)]")
                }
              >
                <span>Semua Buku</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-black/10 dark:bg-white/20">
                  {counts.all}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setFilter("in_progress")}
                className={
                  "px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap border transition-all inline-flex items-center gap-1.5 " +
                  (filter === "in_progress"
                    ? "bg-[var(--color-publiora-black)] text-white border-[var(--color-publiora-black)] shadow-xs"
                    : "bg-white text-[var(--color-medium-gray)] border-[var(--color-publiora-border)] hover:bg-[var(--color-surface-2)]")
                }
              >
                <span>Sedang Dibaca</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-black/10 dark:bg-white/20">
                  {counts.in_progress}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setFilter("completed")}
                className={
                  "px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap border transition-all inline-flex items-center gap-1.5 " +
                  (filter === "completed"
                    ? "bg-[var(--color-publiora-black)] text-white border-[var(--color-publiora-black)] shadow-xs"
                    : "bg-white text-[var(--color-medium-gray)] border-[var(--color-publiora-border)] hover:bg-[var(--color-surface-2)]")
                }
              >
                <span>Selesai</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-black/10 dark:bg-white/20">
                  {counts.completed}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setFilter("unread")}
                className={
                  "px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap border transition-all inline-flex items-center gap-1.5 " +
                  (filter === "unread"
                    ? "bg-[var(--color-publiora-black)] text-white border-[var(--color-publiora-black)] shadow-xs"
                    : "bg-white text-[var(--color-medium-gray)] border-[var(--color-publiora-border)] hover:bg-[var(--color-surface-2)]")
                }
              >
                <span>Belum Dibaca</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-black/10 dark:bg-white/20">
                  {counts.unread}
                </span>
              </button>
            </div>

            {/* Search Box */}
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[var(--color-medium-gray)]" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Cari di pustaka…"
                className="h-8.5 w-full pl-9 pr-8 rounded-[var(--radius-input)] border border-[var(--color-publiora-border)] bg-white text-xs sm:text-sm text-[var(--color-deep-gray)] placeholder:text-[var(--color-soft-gray)] focus:border-[var(--color-publiora-blue)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-publiora-blue)]"
              />
              {q && (
                <button
                  type="button"
                  onClick={() => setQ("")}
                  aria-label="Hapus pencarian"
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--color-soft-gray)] hover:text-[var(--color-deep-gray)]"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>
          </div>

          {/* Book Shelves Grid */}
          {filtered.length === 0 ? (
            <Card>
              <EmptyState
                icon={<Bookmark className="h-7 w-7 text-[var(--color-medium-gray)]" />}
                title="Tidak ada ebook yang cocok"
                description="Cobalah ubah filter bacaan atau kata kunci pencarian Anda."
                action={
                  <Button size="sm" variant="outline" onClick={() => { setQ(""); setFilter("all"); }}>
                    Reset Filter
                  </Button>
                }
              />
            </Card>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              {filtered.map((e) => {
                const p = progressMap.get(e.ebook_id);
                const readingCopy = getReadingStateCopy(p?.progress ?? 0);

                return (
                  <div
                    key={e.id}
                    className="group rounded-xl border border-[var(--color-publiora-border)] bg-white p-4 shadow-[var(--shadow-card)] hover:shadow-[var(--shadow-card-hover)] hover:border-[var(--color-medium-gray)]/30 transition-all flex flex-col justify-between"
                  >
                    <div>
                      {/* Book Cover Container */}
                      <div className="flex justify-center py-2">
                        <Link
                          href={`/read/${e.ebook_slug}`}
                          className="group/book focus-visible:outline-none"
                        >
                          <BookCover
                            id={e.ebook_id}
                            title={e.ebook_title}
                            author={e.author}
                            coverColor={e.cover_color}
                            size="md"
                            className="group-hover/book:scale-[1.03] group-hover/book:-translate-y-1 transition-all duration-200"
                          />
                        </Link>
                      </div>

                      {/* Title & Author */}
                      <div className="mt-3 text-center sm:text-left">
                        <Link
                          href={`/read/${e.ebook_slug}`}
                          className="focus-visible:outline-none"
                        >
                          <h3 className="font-semibold text-sm sm:text-base text-[var(--color-publiora-black)] group-hover:text-[var(--color-publiora-blue)] transition-colors line-clamp-2 leading-snug">
                            {e.ebook_title}
                          </h3>
                        </Link>
                        <p className="mt-1 text-xs text-[var(--color-medium-gray)] truncate">
                          oleh {e.author}
                        </p>
                      </div>
                    </div>

                    {/* Progress Info & Action */}
                    <div className="mt-4 pt-3 border-t border-[var(--color-publiora-border)] space-y-2.5">
                      {p && p.progress > 0 ? (
                        <div>
                          <div className="flex items-center justify-between text-xs text-[var(--color-medium-gray)]">
                            <span className="font-medium text-[var(--color-deep-gray)]">
                              {p.progress >= 100 ? (
                                <span className="inline-flex items-center gap-1 text-[var(--color-success)] font-medium">
                                  <CheckCircle2 className="h-3 w-3" />
                                  Selesai
                                </span>
                              ) : (
                                `${p.progress}% selesai`
                              )}
                            </span>
                            <span className="text-[11px]">
                              Bagian {p.current_section}/{p.total_sections}
                            </span>
                          </div>
                          <ProgressBar
                            value={p.progress}
                            className="mt-1.5 h-1.5"
                            barClassName={
                              p.progress >= 100
                                ? "bg-[var(--color-success)]"
                                : "bg-[var(--color-publiora-blue)]"
                            }
                          />
                        </div>
                      ) : (
                        <div className="text-xs text-[var(--color-soft-gray)] font-medium">
                          {readingCopy.progressLabel}
                        </div>
                      )}

                      <Link
                        href={`/read/${e.ebook_slug}`}
                        className="inline-flex w-full items-center justify-center gap-1.5 rounded-[var(--radius-button)] border border-[var(--color-publiora-border)] bg-[var(--color-surface-2)] py-2 text-xs font-medium text-[var(--color-deep-gray)] hover:bg-[var(--color-surface-3)] transition-colors"
                      >
                        {p && p.progress > 0 && p.progress < 100
                          ? libraryId.continue
                          : libraryId.read}
                        <ArrowRight className="h-3 w-3" />
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}
