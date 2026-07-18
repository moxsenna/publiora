"use client";

import Link from "next/link";
import { useProjects, usePublishedEbooks } from "@/lib/api/hooks";
import { useAuthStore } from "@/store/authStore";
import { Card, CardBody, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
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
import { formatRelativeTime, greeting } from "@/lib/utils";

export default function DashboardPage() {
  const profile = useAuthStore((s) => s.profile);
  const { data: projects, isLoading: lp } = useProjects();
  const { data: published, isLoading: lpub } = usePublishedEbooks();
  const { data: balance, isLoading: lb } = useCreditBalance();

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
            Ringkasan aktivitas Publiora Anda.
            {generating > 0 ? ` · ${generating} project sedang generate.` : ""}
          </p>
        </div>
        <Link href="/projects/new">
          <Button size="sm">
            <Plus className="h-3.5 w-3.5" />
            New project
          </Button>
        </Link>
      </div>

      {/* Quick actions */}
      <div className="grid sm:grid-cols-3 gap-2.5">
        <QuickAction
          href="/projects/new"
          icon={<Plus className="h-3.5 w-3.5" />}
          title="Buat project"
          desc="Mulai ebook baru dari brief"
        />
        <QuickAction
          href="/settings/billing"
          icon={<CreditCard className="h-3.5 w-3.5" />}
          title="Billing"
          desc={
            balance
              ? `${balance.balance} kredit · plan ${balance.plan_id}`
              : "Langganan & kredit generate"
          }
        />
        <QuickAction
          href="/library"
          icon={<Gift className="h-3.5 w-3.5" />}
          title="Library"
          desc="Ebook yang sudah diklaim"
        />
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-2.5">
        <StatCard
          label="Credits"
          value={balance?.balance ?? 0}
          icon={<Coins className="h-3.5 w-3.5" />}
          loading={lb}
        />
        <StatCard
          label="Projects"
          value={projects?.length ?? 0}
          icon={<Folder className="h-3.5 w-3.5" />}
          loading={lp}
        />
        <StatCard
          label="Published"
          value={published?.length ?? 0}
          icon={<BookOpen className="h-3.5 w-3.5" />}
          loading={lpub}
        />
        <StatCard
          label="Total readers"
          value={totalReaders}
          icon={<Users className="h-3.5 w-3.5" />}
          loading={lpub}
        />
        <StatCard
          label="Active claims"
          value={activeClaims}
          icon={<Link2 className="h-3.5 w-3.5" />}
          loading={lpub}
        />
      </div>

      <section>
        <div className="flex items-center justify-between mb-2.5">
          <h2 className="text-base font-semibold text-[var(--color-publiora-black)]">
            Recent projects
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
        ) : recentProjects.length === 0 ? (
          <Card>
            <EmptyState
              icon={<Folder className="h-5 w-5" />}
              title="Belum ada project"
              description="Mulai project pertama untuk membuat ebook."
              action={
                <Link href="/projects/new">
                  <Button size="sm">New project</Button>
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
                      Updated {formatRelativeTime(p.updated_at)}
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
            Published ebooks
          </h2>
        </div>
        {lpub ? (
          <div className="grid md:grid-cols-3 gap-2.5">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-28" />
            ))}
          </div>
        ) : recentPublished.length === 0 ? (
          <Card>
            <EmptyState
              icon={<TrendingUp className="h-5 w-5" />}
              title="Belum ada ebook terpublished"
              description="Generate project hingga semua section siap, lalu publish."
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
                      <span>{p.total_readers} readers</span>
                      <span>{p.active_claims} claims</span>
                      <span>{p.sections.length} sections</span>
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
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  loading?: boolean;
}) {
  return (
    <Card>
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
