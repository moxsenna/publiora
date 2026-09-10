"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useProjects } from "@/lib/api/hooks";
import { Card, CardBody } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { ProjectStatusPill } from "@/components/ui/StatusPill";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { BookCover } from "@/components/books/BookCover";
import {
  Plus,
  Search,
  Folder,
  LayoutGrid,
  List as ListIcon,
  BookOpen,
  CheckCircle2,
  Sparkles,
  FileText,
  Eye,
  ArrowUpRight,
  X,
} from "lucide-react";
import { formatRelativeTime } from "@/lib/utils";
import { ebookTypeLabelsId } from "@/lib/i18n/id/projects";
import type { ProjectStatus, Project } from "@/types/project";

const FILTERS: { id: "all" | ProjectStatus; label: string }[] = [
  { id: "all", label: "Semua" },
  { id: "draft", label: "Draft" },
  { id: "outline_draft", label: "Outline" },
  { id: "generating", label: "Generating" },
  { id: "generated", label: "Generated" },
  { id: "published", label: "Diterbitkan" },
];

export default function ProjectsPage() {
  const { data: projects, isLoading } = useProjects();
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<"all" | ProjectStatus>("all");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  // Summary metrics
  const stats = useMemo(() => {
    const list = projects ?? [];
    return {
      total: list.length,
      published: list.filter((p) => p.status === "published").length,
      inProgress: list.filter(
        (p) =>
          p.status === "generating" ||
          p.status === "generated" ||
          p.status === "outline_draft"
      ).length,
      draft: list.filter((p) => p.status === "draft").length,
    };
  }, [projects]);

  // Counts per filter
  const filterCounts = useMemo(() => {
    const list = projects ?? [];
    const counts: Record<string, number> = { all: list.length };
    for (const f of FILTERS) {
      if (f.id !== "all") {
        counts[f.id] = list.filter((p) => p.status === f.id).length;
      }
    }
    return counts;
  }, [projects]);

  const filtered = useMemo(() => {
    return (projects ?? [])
      .filter((p) => {
        if (status !== "all" && p.status !== status) return false;
        const hay = `${p.title} ${p.niche} ${p.description} ${p.author}`.toLowerCase();
        return hay.includes(q.toLowerCase());
      })
      .sort((a, b) => b.updated_at.localeCompare(a.updated_at));
  }, [projects, q, status]);

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-5 py-6 space-y-6">
      {/* Top Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[var(--color-publiora-black)]">
            Studio Proyek
          </h1>
          <p className="text-sm text-[var(--color-medium-gray)] mt-1">
            Kelola dan kembangkan seluruh naskah ebook Anda di satu workspace terpadu.
          </p>
        </div>
        <Link href="/projects/new">
          <Button size="sm" className="shadow-sm">
            <Plus className="h-4 w-4" />
            Proyek Baru
          </Button>
        </Link>
      </div>

      {/* Studio Summary Metrics Bar */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="rounded-xl border border-[var(--color-publiora-border)] bg-white p-3.5 shadow-xs flex items-center gap-3">
          <div className="h-9 w-9 rounded-lg bg-[var(--color-surface-2)] flex items-center justify-center text-[var(--color-deep-gray)] shrink-0">
            <BookOpen className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <p className="text-xs text-[var(--color-medium-gray)] font-medium truncate">
              Total Ebook
            </p>
            <p className="text-lg font-bold text-[var(--color-publiora-black)] leading-tight">
              {isLoading ? "—" : stats.total}
            </p>
          </div>
        </div>

        <div className="rounded-xl border border-[var(--color-publiora-border)] bg-white p-3.5 shadow-xs flex items-center gap-3">
          <div className="h-9 w-9 rounded-lg bg-[var(--color-success)]/10 flex items-center justify-center text-[var(--color-success)] shrink-0">
            <CheckCircle2 className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <p className="text-xs text-[var(--color-medium-gray)] font-medium truncate">
              Diterbitkan
            </p>
            <p className="text-lg font-bold text-[var(--color-publiora-black)] leading-tight">
              {isLoading ? "—" : stats.published}
            </p>
          </div>
        </div>

        <div className="rounded-xl border border-[var(--color-publiora-border)] bg-white p-3.5 shadow-xs flex items-center gap-3">
          <div className="h-9 w-9 rounded-lg bg-[var(--color-publiora-blue)]/10 flex items-center justify-center text-[var(--color-publiora-blue)] shrink-0">
            <Sparkles className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <p className="text-xs text-[var(--color-medium-gray)] font-medium truncate">
              Dalam Penulisan
            </p>
            <p className="text-lg font-bold text-[var(--color-publiora-black)] leading-tight">
              {isLoading ? "—" : stats.inProgress}
            </p>
          </div>
        </div>

        <div className="rounded-xl border border-[var(--color-publiora-border)] bg-white p-3.5 shadow-xs flex items-center gap-3">
          <div className="h-9 w-9 rounded-lg bg-[var(--color-surface-3)] flex items-center justify-center text-[var(--color-medium-gray)] shrink-0">
            <FileText className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <p className="text-xs text-[var(--color-medium-gray)] font-medium truncate">
              Draft Awal
            </p>
            <p className="text-lg font-bold text-[var(--color-publiora-black)] leading-tight">
              {isLoading ? "—" : stats.draft}
            </p>
          </div>
        </div>
      </div>

      {/* Controls: Search + Filter Tabs + View Mode */}
      <div className="flex flex-col lg:flex-row gap-3 lg:items-center justify-between">
        <div className="flex flex-col sm:flex-row gap-2.5 sm:items-center flex-1 min-w-0">
          {/* Search Box */}
          <div className="relative w-full sm:w-72 md:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[var(--color-medium-gray)]" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Cari judul, topik, atau penulis…"
              className="h-9 w-full pl-9 pr-8 rounded-[var(--radius-input)] border border-[var(--color-publiora-border)] bg-white text-sm text-[var(--color-deep-gray)] placeholder:text-[var(--color-soft-gray)] focus:border-[var(--color-publiora-blue)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-publiora-blue)]"
            />
            {q && (
              <button
                type="button"
                onClick={() => setQ("")}
                aria-label="Hapus pencarian"
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--color-soft-gray)] hover:text-[var(--color-deep-gray)]"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Filter Pills with Counters */}
          <div className="flex gap-1.5 overflow-x-auto no-scrollbar py-0.5">
            {FILTERS.map((f) => {
              const count = filterCounts[f.id] ?? 0;
              const active = status === f.id;
              return (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setStatus(f.id)}
                  className={
                    "px-3 h-8.5 rounded-full text-xs font-medium whitespace-nowrap border transition-all inline-flex items-center gap-1.5 " +
                    (active
                      ? "bg-[var(--color-publiora-black)] text-white border-[var(--color-publiora-black)] shadow-xs"
                      : "bg-white text-[var(--color-medium-gray)] border-[var(--color-publiora-border)] hover:bg-[var(--color-surface-2)]")
                  }
                >
                  <span>{f.label}</span>
                  <span
                    className={
                      "text-[10px] px-1.5 py-0.2 rounded-full " +
                      (active
                        ? "bg-white/20 text-white"
                        : "bg-[var(--color-surface-2)] text-[var(--color-medium-gray)]")
                    }
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* View Mode Toggle (Grid vs List) */}
        <div className="flex items-center gap-1 bg-[var(--color-surface-2)] p-1 rounded-lg border border-[var(--color-publiora-border)] self-end lg:self-auto shrink-0">
          <button
            type="button"
            onClick={() => setViewMode("grid")}
            aria-label="Tampilan Grid"
            className={
              "p-1.5 rounded-md text-xs font-medium transition-colors " +
              (viewMode === "grid"
                ? "bg-white text-[var(--color-publiora-black)] shadow-xs"
                : "text-[var(--color-medium-gray)] hover:text-[var(--color-publiora-black)]")
            }
          >
            <LayoutGrid className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => setViewMode("list")}
            aria-label="Tampilan List"
            className={
              "p-1.5 rounded-md text-xs font-medium transition-colors " +
              (viewMode === "list"
                ? "bg-white text-[var(--color-publiora-black)] shadow-xs"
                : "text-[var(--color-medium-gray)] hover:text-[var(--color-publiora-black)]")
            }
          >
            <ListIcon className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      {isLoading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="rounded-[var(--radius-card)] border border-[var(--color-publiora-border)] bg-white p-4 space-y-3"
            >
              <div className="flex gap-3">
                <Skeleton className="w-20 h-28 shrink-0 rounded-r-md" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-5 w-full" />
                  <Skeleton className="h-4 w-3/4" />
                </div>
              </div>
              <Skeleton className="h-2 w-full mt-4" />
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <EmptyState
            icon={<Folder className="h-7 w-7 text-[var(--color-medium-gray)]" />}
            title={q || status !== "all" ? "Tidak menemukan proyek" : "Belum ada proyek ebook"}
            description={
              q || status !== "all"
                ? "Coba gunakan kata kunci pencarian atau filter status yang lain."
                : "Buat naskah ebook pertama Anda sekarang dengan panduan AI Publiora."
            }
            action={
              !q && status === "all" ? (
                <Link href="/projects/new">
                  <Button size="sm">Mulai Proyek Baru</Button>
                </Link>
              ) : null
            }
          />
        </Card>
      ) : viewMode === "grid" ? (
        /* GRID VIEW */
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((p) => {
            const pct =
              p.total_sections > 0
                ? Math.round((p.sections_generated / p.total_sections) * 100)
                : p.progress;

            return (
              <div
                key={p.id}
                className="group relative rounded-[var(--radius-card)] border border-[var(--color-publiora-border)] bg-white shadow-[var(--shadow-card)] hover:shadow-[var(--shadow-card-hover)] hover:border-[var(--color-medium-gray)]/30 transition-all flex flex-col justify-between overflow-hidden"
              >
                <div className="p-4 sm:p-5 flex gap-4">
                  {/* Book 3D Cover */}
                  <Link
                    href={`/projects/${p.id}`}
                    className="shrink-0 group/cover focus-visible:outline-none"
                  >
                    <BookCover
                      title={p.title}
                      author={p.author}
                      category={p.niche}
                      coverColor={p.cover_color}
                      size="sm"
                      className="group-hover/cover:scale-[1.03] transition-transform shadow-md"
                    />
                  </Link>

                  {/* Project Info */}
                  <div className="flex-1 min-w-0 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <ProjectStatusPill status={p.status} />
                        {p.ebook_type && (
                          <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-[var(--color-surface-2)] text-[var(--color-deep-gray)] border border-[var(--color-publiora-border)]">
                            {ebookTypeLabelsId[p.ebook_type] ?? p.ebook_type}
                          </span>
                        )}
                      </div>

                      <Link href={`/projects/${p.id}`} className="block mt-2 focus-visible:outline-none">
                        <h3 className="font-semibold text-base text-[var(--color-publiora-black)] group-hover:text-[var(--color-publiora-blue)] transition-colors line-clamp-2 leading-snug">
                          {p.title}
                        </h3>
                      </Link>

                      <p className="mt-1 text-xs text-[var(--color-medium-gray)] line-clamp-2 leading-relaxed">
                        {p.description || "Belum ada deskripsi proyek."}
                      </p>
                    </div>

                    <div className="pt-2 text-[11px] text-[var(--color-medium-gray)] truncate">
                      {p.niche ? `Niche: ${p.niche}` : `Penulis: ${p.author}`}
                    </div>
                  </div>
                </div>

                {/* Progress & Quick Actions Footer */}
                <div className="px-4 py-3 bg-[var(--color-surface-2)]/60 border-t border-[var(--color-publiora-border)] space-y-2">
                  <div className="flex items-center justify-between text-xs text-[var(--color-medium-gray)]">
                    <span className="font-medium text-[var(--color-deep-gray)]">
                      {p.total_sections > 0
                        ? `${p.sections_generated}/${p.total_sections} Bagian (${pct}%)`
                        : "Struktur awal"}
                    </span>
                    <span className="text-[11px]">{formatRelativeTime(p.updated_at)}</span>
                  </div>

                  {p.total_sections > 0 && (
                    <ProgressBar
                      value={pct}
                      barClassName={
                        p.status === "published"
                          ? "bg-[var(--color-success)]"
                          : p.status === "generating"
                            ? "bg-[var(--color-publiora-blue)]"
                            : "bg-[var(--color-gold)]"
                      }
                    />
                  )}

                  <div className="pt-1 flex items-center justify-between gap-2 text-xs">
                    <Link
                      href={`/projects/${p.id}`}
                      className="inline-flex items-center gap-1 font-semibold text-[var(--color-publiora-blue)] hover:underline"
                    >
                      Buka Studio
                      <ArrowUpRight className="h-3 w-3" />
                    </Link>

                    <Link
                      href={`/projects/${p.id}/preview`}
                      className="inline-flex items-center gap-1 text-[var(--color-medium-gray)] hover:text-[var(--color-publiora-black)] font-medium"
                    >
                      <Eye className="h-3 w-3" />
                      Pratinjau
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* LIST VIEW */
        <div className="rounded-[var(--radius-card)] border border-[var(--color-publiora-border)] bg-white overflow-hidden shadow-xs divide-y divide-[var(--color-publiora-border)]">
          {filtered.map((p) => {
            const pct =
              p.total_sections > 0
                ? Math.round((p.sections_generated / p.total_sections) * 100)
                : p.progress;

            return (
              <div
                key={p.id}
                className="p-3.5 sm:p-4 hover:bg-[var(--color-surface-2)]/50 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                <div className="flex items-center gap-3.5 min-w-0 flex-1">
                  <Link href={`/projects/${p.id}`} className="shrink-0">
                    <div
                      className="w-10 h-14 rounded-r-sm rounded-l-xs shadow-sm flex items-center justify-center text-white text-[8px] font-bold select-none"
                      style={{ backgroundColor: p.cover_color }}
                    >
                      PUB
                    </div>
                  </Link>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Link
                        href={`/projects/${p.id}`}
                        className="font-semibold text-sm sm:text-base text-[var(--color-publiora-black)] hover:text-[var(--color-publiora-blue)] transition-colors truncate"
                      >
                        {p.title}
                      </Link>
                      <ProjectStatusPill status={p.status} />
                    </div>

                    <p className="text-xs text-[var(--color-medium-gray)] line-clamp-1 mt-0.5">
                      {p.description || "Belum ada deskripsi"} · {p.niche}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-4 sm:gap-6 shrink-0 justify-between md:justify-end">
                  <div className="w-32 sm:w-40 space-y-1">
                    <div className="flex justify-between text-[11px] text-[var(--color-medium-gray)]">
                      <span>
                        {p.sections_generated}/{p.total_sections || "—"} bagian
                      </span>
                      <span>{pct}%</span>
                    </div>
                    <ProgressBar
                      value={pct}
                      barClassName={
                        p.status === "published"
                          ? "bg-[var(--color-success)]"
                          : "bg-[var(--color-publiora-blue)]"
                      }
                    />
                  </div>

                  <span className="text-xs text-[var(--color-medium-gray)] whitespace-nowrap hidden lg:inline-block">
                    {formatRelativeTime(p.updated_at)}
                  </span>

                  <div className="flex items-center gap-2 shrink-0">
                    <Link
                      href={`/projects/${p.id}/preview`}
                      className="p-1.5 rounded-lg text-[var(--color-medium-gray)] hover:bg-[var(--color-surface-3)] hover:text-[var(--color-publiora-black)]"
                      title="Pratinjau Ebook"
                    >
                      <Eye className="h-4 w-4" />
                    </Link>
                    <Link href={`/projects/${p.id}`}>
                      <Button size="sm" variant="outline" className="h-8 text-xs px-2.5">
                        Buka Studio
                      </Button>
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
