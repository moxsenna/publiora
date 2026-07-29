"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Folder, Plus, Search } from "lucide-react";
import { useProjects } from "@/lib/api/hooks";
import { Card, CardBody } from "@/components/ui/Card";
import { ProjectStatusPill } from "@/components/ui/StatusPill";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/PageState";
import { Skeleton } from "@/components/ui/Skeleton";
import { ProgressBar } from "@/components/ui/ProgressBar";
import {
  formatSectionCount,
  projectFiltersId,
  projectsId,
  type ProjectFilter,
} from "@/lib/i18n/id/projects";
import { formatDashboardRelativeTime } from "@/lib/i18n/id/dashboard";

const primaryLinkClass =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-[var(--radius-button)] bg-[var(--color-publiora-blue)] px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[var(--color-publiora-blue-dark)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-publiora-blue)]";

export default function ProjectsPage() {
  const { data: projects, isLoading, isError, refetch } = useProjects();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<ProjectFilter>("all");

  const filtered = useMemo(() => {
    return (projects ?? [])
      .filter((project) => {
        if (status !== "all" && project.status !== status) return false;
        const haystack = `${project.title} ${project.niche} ${project.description}`.toLocaleLowerCase("id-ID");
        return haystack.includes(query.toLocaleLowerCase("id-ID"));
      })
      .sort((a, b) => b.updated_at.localeCompare(a.updated_at));
  }, [projects, query, status]);

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-3 py-6 sm:px-5 sm:py-8">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold tracking-tight text-[var(--color-publiora-black)] sm:text-3xl">
            {projectsId.title}
          </h1>
          <p className="mt-1 text-sm text-[var(--color-medium-gray)]">
            {projectsId.description}
            {!isLoading && !isError && projects ? ` · ${projects.length} ${projectsId.total}` : ""}
          </p>
        </div>
        <Link href="/projects/new" className={primaryLinkClass}>
          <Plus aria-hidden="true" className="h-4 w-4" />
          {projectsId.newProject}
        </Link>
      </header>

      <section aria-label="Pencarian dan filter proyek" className="rounded-[var(--radius-card)] border border-[var(--color-publiora-border)] bg-white p-3 shadow-[var(--shadow-card)] sm:p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative min-w-0 flex-1 sm:max-w-md">
            <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-medium-gray)]" />
            <input
              aria-label={projectsId.searchLabel}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={projectsId.searchPlaceholder}
              className="min-h-11 w-full rounded-[var(--radius-input)] border border-[var(--color-publiora-border)] bg-white pl-10 pr-3 text-sm text-[var(--color-deep-gray)] focus:border-[var(--color-publiora-blue)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-publiora-blue)]"
            />
          </div>
          <div className="flex gap-1.5 overflow-x-auto pb-1" aria-label="Filter status proyek">
            {projectFiltersId.map((filter) => (
              <button
                key={filter.id}
                type="button"
                aria-pressed={status === filter.id}
                onClick={() => setStatus(filter.id)}
                className={`min-h-11 shrink-0 rounded-full border px-3 text-sm font-medium transition-colors ${
                  status === filter.id
                    ? "border-[var(--color-publiora-black)] bg-[var(--color-publiora-black)] text-white"
                    : "border-[var(--color-publiora-border)] bg-white text-[var(--color-medium-gray)] hover:bg-[var(--color-surface-2)]"
                }`}
              >
                {filter.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      {isLoading ? (
        <div aria-label="Memuat proyek" className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => <Skeleton key={index} className="h-56" />)}
        </div>
      ) : isError ? (
        <Card>
          <ErrorState description={projectsId.loadError} retryLabel={projectsId.retry} onRetry={() => void refetch()} />
        </Card>
      ) : filtered.length === 0 ? (
        <Card>
          <EmptyState
            icon={<Folder aria-hidden="true" className="h-6 w-6" />}
            title={query || status !== "all" ? projectsId.noResults : projectsId.empty}
            description={query || status !== "all" ? projectsId.noResultsDescription : projectsId.emptyDescription}
            action={!query && status === "all" ? <Link href="/projects/new" className={primaryLinkClass}>{projectsId.newProject}</Link> : null}
          />
        </Card>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map((project) => {
            const percentage = project.total_sections > 0
              ? Math.round((project.sections_generated / project.total_sections) * 100)
              : project.progress;
            return (
              <Link key={project.id} href={`/projects/${project.id}`} className="min-w-0 rounded-[var(--radius-card)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-publiora-blue)]">
                <Card className="h-full min-w-0 cursor-pointer overflow-hidden transition-transform transition-shadow hover:-translate-y-0.5 hover:shadow-[var(--shadow-card-hover)]">
                  <div className="relative flex h-28 items-end overflow-hidden p-4" style={{ background: project.cover_color }}>
                    <div aria-hidden="true" className="absolute inset-0 bg-black/45" />
                    <h2 className="relative z-10 line-clamp-2 min-w-0 break-words text-lg font-semibold text-white drop-shadow">
                      {project.title}
                    </h2>
                  </div>
                  <CardBody className="min-w-0">
                    <div className="flex min-w-0 items-center justify-between gap-2">
                      <ProjectStatusPill status={project.status} />
                      <span className="min-w-0 truncate text-xs text-[var(--color-medium-gray)]">{project.niche}</span>
                    </div>
                    <p className="mt-3 line-clamp-2 break-words text-sm text-[var(--color-medium-gray)]">{project.description}</p>
                    <div className="mt-4 space-y-2">
                      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-[var(--color-medium-gray)]">
                        <span>{project.sections_generated}/{project.total_sections || "—"} · {formatSectionCount(project.total_sections)}</span>
                        <span>{projectsId.updated} {formatDashboardRelativeTime(project.updated_at)}</span>
                      </div>
                      {project.total_sections > 0 && (
                        <ProgressBar
                          value={percentage}
                          aria-label={`${projectsId.progress} ${project.title}`}
                          barClassName={project.status === "published" ? "bg-[var(--color-success)]" : project.status === "generating" ? "bg-[var(--color-publiora-blue)]" : "bg-[var(--color-soft-gray)]"}
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
