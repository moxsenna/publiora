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
import { Plus, Search, Folder } from "lucide-react";
import { formatRelativeTime } from "@/lib/utils";
import type { ProjectStatus } from "@/types/project";

const FILTERS: { id: "all" | ProjectStatus; label: string }[] = [
  { id: "all", label: "All" },
  { id: "draft", label: "Draft" },
  { id: "outline_draft", label: "Outline" },
  { id: "generating", label: "Generating" },
  { id: "generated", label: "Generated" },
  { id: "published", label: "Published" },
];

export default function ProjectsPage() {
  const { data: projects, isLoading } = useProjects();
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<"all" | ProjectStatus>("all");

  const filtered = useMemo(() => {
    return (projects ?? [])
      .filter((p) => {
        if (status !== "all" && p.status !== status) return false;
        const hay = `${p.title} ${p.niche} ${p.description}`.toLowerCase();
        return hay.includes(q.toLowerCase());
      })
      .sort((a, b) => b.updated_at.localeCompare(a.updated_at));
  }, [projects, q, status]);

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-5 py-5 space-y-4">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-xl font-bold text-[var(--color-publiora-black)]">Projects</h1>
          <p className="text-sm text-[var(--color-medium-gray)] mt-0.5">
            Semua project ebook Anda.
            {!isLoading && projects ? ` · ${projects.length} total` : ""}
          </p>
        </div>
        <Link href="/projects/new">
          <Button size="sm">
            <Plus className="h-3.5 w-3.5" />
            New project
          </Button>
        </Link>
      </div>

      <div className="flex flex-col sm:flex-row gap-2.5 sm:items-center">
        <div className="relative max-w-md flex-1">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[var(--color-medium-gray)]" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Cari project…"
            className="h-9 w-full pl-8 pr-3 rounded-[var(--radius-input)] border border-[var(--color-publiora-border)] bg-white text-sm text-[var(--color-deep-gray)] focus:border-[var(--color-publiora-blue)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-publiora-blue)]"
          />
        </div>
        <div className="flex gap-1 overflow-x-auto no-scrollbar pb-0.5">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setStatus(f.id)}
              className={
                "px-2.5 h-8 rounded-full text-xs font-medium whitespace-nowrap border transition-colors " +
                (status === f.id
                  ? "bg-[var(--color-publiora-black)] text-white border-[var(--color-publiora-black)]"
                  : "bg-white text-[var(--color-medium-gray)] border-[var(--color-publiora-border)] hover:bg-[var(--color-surface-2)]")
              }
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-2.5">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-36" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <EmptyState
            icon={<Folder className="h-6 w-6" />}
            title={q || status !== "all" ? "Tidak menemukan project" : "Belum ada project"}
            description={
              q || status !== "all"
                ? "Coba kata kunci atau filter lain."
                : "Mulai project pertama Anda sekarang."
            }
            action={
              !q && status === "all" ? (
                <Link href="/projects/new">
                  <Button size="sm">New project</Button>
                </Link>
              ) : null
            }
          />
        </Card>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-2.5">
          {filtered.map((p) => {
            const pct =
              p.total_sections > 0
                ? Math.round((p.sections_generated / p.total_sections) * 100)
                : p.progress;
            return (
              <Link key={p.id} href={`/projects/${p.id}`}>
                <Card className="hover:shadow-[var(--shadow-card-hover)] hover:-translate-y-0.5 transition-shadow transition-transform cursor-pointer h-full">
                  <div
                    className="h-20 rounded-t-[var(--radius-card)] flex items-end p-3 relative overflow-hidden"
                    style={{ background: p.cover_color }}
                  >
                    <h3 className="text-white font-semibold text-base line-clamp-2 drop-shadow relative z-10">
                      {p.title}
                    </h3>
                  </div>
                  <CardBody>
                    <div className="flex items-center justify-between gap-2">
                      <ProjectStatusPill status={p.status} />
                      <span className="text-xs text-[var(--color-medium-gray)] truncate">
                        {p.niche}
                      </span>
                    </div>
                    <p className="mt-3 text-sm text-[var(--color-medium-gray)] line-clamp-2">
                      {p.description}
                    </p>
                    <div className="mt-3 space-y-1.5">
                      <div className="flex items-center justify-between text-xs text-[var(--color-medium-gray)]">
                        <span>
                          {p.sections_generated}/{p.total_sections || "—"} sections
                        </span>
                        <span>{formatRelativeTime(p.updated_at)}</span>
                      </div>
                      {p.total_sections > 0 && (
                        <ProgressBar
                          value={pct}
                          barClassName={
                            p.status === "published"
                              ? "bg-[var(--color-success)]"
                              : p.status === "generating"
                                ? "bg-[var(--color-publiora-blue)]"
                                : "bg-[var(--color-soft-gray)]"
                          }
                        />
                      )}
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
