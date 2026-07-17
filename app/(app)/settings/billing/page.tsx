"use client";

import * as React from "react";
import {
  useCreditBalance,
  useCreditTransactions,
  usePlans,
  useCreditPacks,
  useSubscription,
  useChangePlan,
  usePurchaseCreditPack,
  useCreditCosts,
} from "@/lib/api/hooks";
import { useUiStore } from "@/store/projectStore";
import { Card, CardBody, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Skeleton } from "@/components/ui/Skeleton";
import { ProgressBar } from "@/components/ui/ProgressBar";
import {
  Coins,
  CreditCard,
  Sparkles,
  Check,
  History,
} from "lucide-react";
import type { PlanId } from "@/types";
import { formatDate, formatRelativeTime, cn } from "@/lib/utils";

export default function BillingPage() {
  const { data: balance, isLoading: lb } = useCreditBalance();
  const { data: sub, isLoading: ls } = useSubscription();
  const { data: plans, isLoading: lp } = usePlans();
  const { data: packs } = useCreditPacks();
  const { data: txns } = useCreditTransactions();
  const { data: costs } = useCreditCosts();
  const changePlan = useChangePlan();
  const buyPack = usePurchaseCreditPack();
  const pushToast = useUiStore((s) => s.pushToast);

  const onChangePlan = async (plan_id: PlanId) => {
    try {
      await changePlan.mutateAsync(plan_id);
      pushToast({
        title: "Plan diubah",
        description: "Kredit bulanan di-reset sesuai plan baru (mock).",
        variant: "success",
      });
    } catch {
      pushToast({ title: "Gagal ubah plan", variant: "danger" });
    }
  };

  const onBuy = async (pack_id: string) => {
    try {
      const res = await buyPack.mutateAsync(pack_id);
      pushToast({
        title: "Top-up berhasil",
        description: `Saldo sekarang ${res.balance.balance} kredit.`,
        variant: "success",
      });
    } catch {
      pushToast({ title: "Top-up gagal", variant: "danger" });
    }
  };

  const usedPct =
    balance && balance.period_grant > 0
      ? Math.round(
          ((balance.period_grant - balance.balance) / balance.period_grant) * 100
        )
      : 0;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[var(--color-publiora-black)]">
          Billing & Credits
        </h1>
        <p className="text-[var(--color-medium-gray)] mt-1">
          Langganan + kredit untuk generate outline, section, title, dan CTA.
        </p>
      </div>

      {/* Balance */}
      <div className="grid md:grid-cols-2 gap-4">
        <Card>
          <CardBody className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="h-11 w-11 rounded-2xl bg-[var(--color-publiora-black)] text-white grid place-items-center">
                <Coins className="h-5 w-5" />
              </div>
              <div>
                <div className="text-xs uppercase tracking-wide text-[var(--color-soft-gray)]">
                  Saldo kredit
                </div>
                {lb ? (
                  <Skeleton className="h-8 w-24 mt-1" />
                ) : (
                  <div className="text-3xl font-bold text-[var(--color-publiora-black)]">
                    {balance?.balance ?? 0}
                  </div>
                )}
              </div>
            </div>
            {balance && (
              <>
                <div>
                  <div className="flex justify-between text-xs text-[var(--color-medium-gray)] mb-1.5">
                    <span>Pemakaian periode</span>
                    <span>
                      {Math.max(0, balance.period_grant - balance.balance)} /{" "}
                      {balance.period_grant}
                    </span>
                  </div>
                  <ProgressBar value={Math.min(100, Math.max(0, usedPct))} />
                </div>
                <p className="text-xs text-[var(--color-soft-gray)]">
                  Periode {formatDate(balance.period_start)} –{" "}
                  {formatDate(balance.period_end)} · Lifetime spent{" "}
                  {balance.lifetime_spent}
                </p>
              </>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardBody className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="h-11 w-11 rounded-2xl bg-[var(--color-surface-2)] border border-[var(--color-publiora-border)] grid place-items-center text-[var(--color-deep-gray)]">
                <CreditCard className="h-5 w-5" />
              </div>
              <div>
                <div className="text-xs uppercase tracking-wide text-[var(--color-soft-gray)]">
                  Subscription
                </div>
                {ls ? (
                  <Skeleton className="h-7 w-28 mt-1" />
                ) : (
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xl font-bold capitalize text-[var(--color-publiora-black)]">
                      {sub?.plan_id}
                    </span>
                    <Badge
                      variant={
                        sub?.status === "active" ? "success" : "warning"
                      }
                    >
                      {sub?.status}
                    </Badge>
                  </div>
                )}
              </div>
            </div>
            {sub?.renews_at && (
              <p className="text-sm text-[var(--color-medium-gray)]">
                Renews {formatDate(sub.renews_at)}
              </p>
            )}
            {costs && (
              <div className="rounded-xl bg-[var(--color-surface-2)] border border-[var(--color-publiora-border)] p-3 text-xs text-[var(--color-medium-gray)] space-y-1">
                <div className="font-medium text-[var(--color-deep-gray)] mb-1">
                  Biaya generate
                </div>
                <div className="flex justify-between">
                  <span>Outline</span>
                  <span>{costs.outline} kredit</span>
                </div>
                <div className="flex justify-between">
                  <span>Section</span>
                  <span>{costs.section} kredit</span>
                </div>
                <div className="flex justify-between">
                  <span>Title / CTA</span>
                  <span>
                    {costs.title} / {costs.cta} kredit
                  </span>
                </div>
              </div>
            )}
          </CardBody>
        </Card>
      </div>

      {/* Plans */}
      <section>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--color-soft-gray)] mb-3">
          Plans
        </h2>
        {lp ? (
          <div className="grid md:grid-cols-3 gap-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-64" />
            ))}
          </div>
        ) : (
          <div className="grid md:grid-cols-3 gap-4">
            {(plans ?? []).map((plan) => {
              const current = sub?.plan_id === plan.id;
              return (
                <Card
                  key={plan.id}
                  className={cn(
                    current && "border-[var(--color-publiora-black)] shadow-[var(--shadow-card)]"
                  )}
                >
                  <CardBody className="space-y-4">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="font-semibold text-[var(--color-publiora-black)]">
                          {plan.name}
                        </div>
                        <div className="mt-1 flex items-baseline gap-1">
                          <span className="text-2xl font-bold">
                            ${plan.price_monthly}
                          </span>
                          <span className="text-xs text-[var(--color-soft-gray)]">
                            /bln
                          </span>
                        </div>
                      </div>
                      {plan.featured && <Badge variant="gold">Popular</Badge>}
                      {current && <Badge variant="success">Current</Badge>}
                    </div>
                    <div className="text-sm text-[var(--color-medium-gray)]">
                      {plan.monthly_credits.toLocaleString()} kredit / bulan
                    </div>
                    <ul className="space-y-2 text-sm">
                      {plan.features.map((f) => (
                        <li key={f} className="flex items-start gap-2">
                          <Check className="h-4 w-4 text-[var(--color-success)] shrink-0 mt-0.5" />
                          <span className="text-[var(--color-deep-gray)]">{f}</span>
                        </li>
                      ))}
                    </ul>
                    <Button
                      className="w-full"
                      variant={current ? "outline" : plan.featured ? "primary" : "secondary"}
                      disabled={current || changePlan.isPending}
                      loading={changePlan.isPending && changePlan.variables === plan.id}
                      onClick={() => onChangePlan(plan.id)}
                    >
                      {current ? "Plan aktif" : "Pilih plan"}
                    </Button>
                  </CardBody>
                </Card>
              );
            })}
          </div>
        )}
      </section>

      {/* Top-up packs */}
      <section>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--color-soft-gray)] mb-3">
          Top-up kredit
        </h2>
        <div className="grid sm:grid-cols-3 gap-3">
          {(packs ?? []).map((pack) => (
            <Card key={pack.id}>
              <CardBody className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="font-semibold text-[var(--color-publiora-black)]">
                    {pack.name}
                  </div>
                  {pack.badge && <Badge variant="gold">{pack.badge}</Badge>}
                </div>
                <div className="text-2xl font-bold text-[var(--color-publiora-black)]">
                  +{pack.credits}
                  <span className="text-sm font-medium text-[var(--color-soft-gray)] ml-1">
                    kredit
                  </span>
                </div>
                <div className="text-sm text-[var(--color-medium-gray)]">
                  ${pack.price}
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="w-full"
                  loading={buyPack.isPending && buyPack.variables === pack.id}
                  onClick={() => onBuy(pack.id)}
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  Beli
                </Button>
              </CardBody>
            </Card>
          ))}
        </div>
        <p className="text-xs text-[var(--color-soft-gray)] mt-2">
          Mock mode: top-up langsung menambah saldo, tanpa payment gateway.
        </p>
      </section>

      {/* History */}
      <section>
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <History className="h-4 w-4 text-[var(--color-medium-gray)]" />
              <CardTitle className="text-base">Riwayat kredit</CardTitle>
            </div>
            <CardDescription>Grant, top-up, dan pemakaian generate.</CardDescription>
          </CardHeader>
          <CardBody className="p-0">
            {!txns || txns.length === 0 ? (
              <div className="px-6 pb-6 text-sm text-[var(--color-soft-gray)]">
                Belum ada transaksi.
              </div>
            ) : (
              <ul className="divide-y divide-[var(--color-publiora-border)]">
                {txns.map((t) => (
                  <li
                    key={t.id}
                    className="px-6 py-3 flex items-center justify-between gap-3 text-sm"
                  >
                    <div className="min-w-0">
                      <div className="font-medium text-[var(--color-deep-gray)] truncate">
                        {t.label}
                      </div>
                      <div className="text-xs text-[var(--color-soft-gray)]">
                        {formatRelativeTime(t.created_at)} · {t.type}
                      </div>
                    </div>
                    <div
                      className={cn(
                        "font-semibold tabular-nums shrink-0",
                        t.amount > 0
                          ? "text-[var(--color-success)]"
                          : "text-[var(--color-deep-gray)]"
                      )}
                    >
                      {t.amount > 0 ? `+${t.amount}` : t.amount}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>
      </section>
    </div>
  );
}
