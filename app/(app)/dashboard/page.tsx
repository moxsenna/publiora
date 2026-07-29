"use client";

import Link from "next/link";
import { useProjects, usePublishedEbooks } from "@/lib/api/hooks";
import { useAuthStore } from "@/store/authStore";
import { Card, CardBody, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { ProjectStatusPill } from "@/components/ui/StatusPill";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { ProgressBar } from "@/components/ui/ProgressBar";
import {
  Folder,
  BookOpen,
  Plus,
  TrendingUp,
  Link2,
  Users,
  CreditCard,
  Gift,
  ArrowRight,
  Coins,
} from "lucide-react";
import { useCreditBalance } from "@/lib/api/hooks";
import { greeting } from "@/lib/utils";
import { dashboardId, formatClaimCount, formatCreditBalance, formatDashboardRelativeTime, formatReaderCount } from "@/lib/i18n/id/dashboard";
import { formatSectionCount } from "@/lib/i18n/id/projects";
import { ErrorState } from "@/components/ui/PageState";

export default function DashboardPage() {
  const profile = useAuthStore((s) => s.profile);
  const { data: projects, isLoading: lp, isError: ep, refetch: refetchProjects } = useProjects();
  const { data: published, isLoading: lpub, isError: epub, refetch: refetchPublished } = usePublishedEbooks();
  const { data: balance, isLoading: lb, isError: eb, refetch: refetchBalance } = useCreditBalance();

  const recentProjects = [...(projects ?? [])]
    .sort((a, b) => b.updated_at.localeCompare(a.updated_at))
    .slice(0, 4);

  const recentPublished = [...(published ?? [])].slice(0, 3);
  const totalReaders = (published ?? []).reduce((s, p) => s + p.total_readers, 0);
  const activeClaims = (published ?? []).reduce((s, p) => s + p.active_claims, 0);
  const generating = (projects ?? []).filter((p) => p.status === "generating").length;

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-5 py-5 space-y-5">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-xl font-bold text-[var(--color-publiora-black)]">
            {greeting(profile?.name)}
          </h1>
          <p className="text-sm text-[var(--color-medium-gray)] mt-0.5">
            {dashboardId.summary}
            {generating > 0 ? ` · ${generating} proyek sedang dibuat.` : ""}
          </p>
        </div>
        <Link
          href="/projects/new"
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-[var(--radius-button)] bg-[var(--color-publiora-blue)] px-4 text-sm font-semibold text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-publiora-blue)]"
        >
          <Plus aria-hidden="true" className="h-4 w-4" />
          {dashboardId.newProject}
        </Link>
      </div>

      {/* Quick actions */}
      <div className="grid sm:grid-cols-3 gap-2.5">
        <QuickAction
          href="/projects/new"
          icon={<Plus className="h-3.5 w-3.5" />}
          title={dashboardId.createProject}
          desc={dashboardId.createProjectDescription}
        />
        <QuickAction
          href="/settings/billing"
          icon={<CreditCard className="h-3.5 w-3.5" />}
          title={dashboardId.billing}
          desc={
            balance
              ? `${formatCreditBalance(balance.balance)} · Paket ${balance.plan_id}`
              : dashboardId.billingDescription
          }
        />
        <QuickAction
          href="/library"
          icon={<Gift className="h-3.5 w-3.5" />}
          title={dashboardId.library}
          desc={dashboardId.libraryDescription}
        />
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-2.5">
        <StatCard
          label={dashboardId.credit}
          value={balance?.balance ?? 0}
          icon={<Coins className="h-3.5 w-3.5" />}
          loading={lb}
          error={eb}
          onRetry={() => void refetchBalance()}
        />
        <StatCard
          label={dashboardId.projects}
          value={projects?.length ?? 0}
          icon={<Folder className="h-3.5 w-3.5" />}
          loading={lp}
          error={ep}
          onRetry={() => void refetchProjects()}
        />
        <StatCard
          label={dashboardId.published}
          value={published?.length ?? 0}
          icon={<BookOpen className="h-3.5 w-3.5" />}
          loading={lpub}
          error={epub}
          onRetry={() => void refetchPublished()}
        />
        <StatCard
          label={dashboardId.totalReaders}
          value={totalReaders}
          icon={<Users className="h-3.5 w-3.5" />}
          loading={lpub}
          error={epub}
          onRetry={() => void refetchPublished()}
        />
        <StatCard
          label={dashboardId.activeClaims}
          value={activeClaims}
          icon={<Link2 className="h-3.5 w-3.5" />}
          loading={lpub}
          error={epub}
          onRetry={() => void refetchPublished()}
        />
      </div>

      <section>
        <div className="flex items-center justify-between mb-2.5">
          <h2 className="text-base font-semibold text-[var(--color-publiora-black)]">
            {dashboardId.recentProjects}
          </h2>
          <Link
            href="/projects"
            className="text-xs font-medium text-[var(--color-publiora-blue)] hover:underline inline-flex items-center gap-1"
          >
            Lihat semua <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
        {lp ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-2.5">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-32" />
            ))}
          </div>
        ) : ep ? (
          <Card><ErrorState description={dashboardId.loadError} onRetry={() => void refetchProjects()} /></Card>
        ) : recentProjects.length === 0 ? (
          <Card>
            <EmptyState
              icon={<Folder className="h-5 w-5" />}
              title={dashboardId.noProjects}
              description={dashboardId.noProjectsDescription}
              action={
                <Link href="/projects/new">
                  <span className="inline-flex min-h-11 items-center rounded-[var(--radius-button)] bg-[var(--color-publiora-blue)] px-4 text-sm font-semibold text-white">{dashboardId.newProject}</span>
                </Link>
              }
            />
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-2.5">
            {recentProjects.map((p) => (
              <Link key={p.id} href={`/projects/${p.id}`}>
                <Card className="hover:shadow-[var(--shadow-card-hover)] hover:-translate-y-0.5 transition-shadow transition-transform h-full cursor-pointer">
                  <div
                    className="h-16 rounded-t-[var(--radius-card)] relative overflow-hidden"
                    style={{ background: p.cover_color }}
                  >
                    {(p.status === "generating" || p.progress > 0) &&
                      p.status !== "published" && (
                        <div className="absolute bottom-0 inset-x-0 px-3 pb-2">
                          <ProgressBar
                            value={p.progress}
                            aria-label={`Progres pembuatan ${p.title}`}
                            barClassName="bg-[var(--color-gold)]"
                          />
                        </div>
                      )}
                  </div>
                  <CardBody>
                    <ProjectStatusPill status={p.status} />
                    <h3 className="mt-2 font-semibold text-[var(--color-publiora-black)] line-clamp-1">
                      {p.title}
                    </h3>
                    <p className="text-xs text-[var(--color-medium-gray)] mt-1">
                      {dashboardId.updated} {formatDashboardRelativeTime(p.updated_at)}
                    </p>
                  </CardBody>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </section>

      <section>
        <div className="flex items-center justify-between mb-2.5">
          <h2 className="text-base font-semibold text-[var(--color-publiora-black)]">
            {dashboardId.publishedEbooks}
          </h2>
        </div>
        {lpub ? (
          <div className="grid md:grid-cols-3 gap-2.5">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-28" />
            ))}
          </div>
        ) : epub ? (
          <Card><ErrorState description={dashboardId.loadError} onRetry={() => void refetchPublished()} /></Card>
        ) : recentPublished.length === 0 ? (
          <Card>
            <EmptyState
              icon={<TrendingUp className="h-5 w-5" />}
              title={dashboardId.noPublished}
              description={dashboardId.noPublishedDescription}
            />
          </Card>
        ) : (
          <div className="grid md:grid-cols-3 gap-2.5">
            {recentPublished.map((p) => (
              <Link key={p.id} href={`/published/${p.id}`}>
                <Card className="hover:shadow-[var(--shadow-card-hover)] hover:-translate-y-0.5 transition-shadow transition-transform cursor-pointer">
                  <CardHeader>
                    <div className="flex items-start gap-2.5">
                      <div
                        className="h-9 w-9 rounded-lg shrink-0"
                        style={{ background: p.cover_color }}
                      />
                      <div className="min-w-0">
                        <CardTitle className="truncate text-sm">{p.title}</CardTitle>
                        <CardDescription>{p.author}</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardBody className="pt-0">
                    <div className="flex items-center gap-3 text-xs text-[var(--color-medium-gray)]">
                      <span>{formatReaderCount(p.total_readers)}</span>
                      <span>{formatClaimCount(p.active_claims)}</span>
                      <span>{formatSectionCount(p.sections.length)}</span>
                    </div>
                  </CardBody>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function QuickAction({
  href,
  icon,
  title,
  desc,
}: {
  href: string;
  icon: React.ReactNode;
  title: string;
  desc: string;
}) {
  return (
    <Link href={href}>
      <Card className="hover:shadow-[var(--shadow-card-hover)] hover:-translate-y-0.5 transition-shadow transition-transform cursor-pointer h-full">
        <CardBody className="flex items-center gap-2.5 py-2.5">
          <div className="h-8 w-8 rounded-lg bg-[var(--color-surface-2)] border border-[var(--color-publiora-border)] grid place-items-center text-[var(--color-deep-gray)] shrink-0">
            {icon}
          </div>
          <div className="min-w-0">
            <div className="text-sm font-semibold text-[var(--color-publiora-black)]">
              {title}
            </div>
            <div className="text-xs text-[var(--color-medium-gray)] truncate">{desc}</div>
          </div>
          <ArrowRight className="h-3.5 w-3.5 text-[var(--color-medium-gray)] ml-auto shrink-0" />
        </CardBody>
      </Card>
    </Link>
  );
}

function StatCard({
  label,
  value,
  icon,
  loading,
  error,
  onRetry,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  loading?: boolean;
  error?: boolean;
  onRetry?: () => void;
}) {
  return (
    <Card role="article">
      <CardBody className="py-2.5">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[11px] font-medium text-[var(--color-medium-gray)] uppercase tracking-wide">
            {label}
          </span>
          <div className="h-6 w-6 rounded-md bg-[var(--color-surface-2)] grid place-items-center text-[var(--color-medium-gray)]">
            {icon}
          </div>
        </div>
        <div className="mt-1.5">
          {loading ? (
            <Skeleton className="h-6 w-12" />
          ) : error ? (
            <div className="space-y-1">
              <span className="block text-xs font-semibold text-[var(--color-danger)]">Data tidak tersedia</span>
              <button
                type="button"
                aria-label={`Coba lagi ${label}`}
                onClick={onRetry}
                className="text-xs font-medium text-[var(--color-publiora-blue)] hover:underline"
              >
                Coba lagi
              </button>
            </div>
          ) : (
            <div className="text-xl font-bold tabular-nums text-[var(--color-publiora-black)]">
              {value}
            </div>
          )}
        </div>
      </CardBody>
    </Card>
  );
}
