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
  isPaymentCheckout,
} from "@/lib/api/hooks";
import { useUiStore } from "@/store/projectStore";
import { Card, CardBody, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Skeleton } from "@/components/ui/Skeleton";
import { ProgressBar } from "@/components/ui/ProgressBar";
import {
  CheckoutPaymentModal,
  type CheckoutIntent,
} from "@/components/billing/CheckoutPaymentModal";
import {
  Coins,
  CreditCard,
  Sparkles,
  Check,
  History,
} from "lucide-react";
import type { PlanId } from "@/types";
import { formatDate, formatRelativeTime, cn } from "@/lib/utils";
import type { PaymentMethodCode } from "@/lib/paycore/methods";

function formatIdr(amount: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(amount);
}

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
  const [checkout, setCheckout] = React.useState<CheckoutIntent | null>(null);

  const onChangePlan = async (
    plan_id: PlanId,
    payment_method?: PaymentMethodCode
  ) => {
    try {
      const res = await changePlan.mutateAsync({ plan_id, payment_method });
      if (isPaymentCheckout(res)) {
        pushToast({
          title: "Mengarahkan ke pembayaran…",
          description: "Selesaikan pembayaran di Duitku via PayCore.",
          variant: "default",
        });
        window.location.href = res.checkout_url;
        return;
      }
      setCheckout(null);
      pushToast({
        title: "Plan diubah",
        description: "Kredit bulanan disesuaikan dengan plan baru.",
        variant: "success",
      });
    } catch {
      pushToast({ title: "Gagal ubah plan", variant: "danger" });
    }
  };

  const onBuy = async (pack_id: string, payment_method?: PaymentMethodCode) => {
    try {
      const res = await buyPack.mutateAsync({ pack_id, payment_method });
      if (isPaymentCheckout(res)) {
        pushToast({
          title: "Mengarahkan ke pembayaran…",
          description: "Selesaikan pembayaran di Duitku via PayCore.",
          variant: "default",
        });
        window.location.href = res.checkout_url;
        return;
      }
      setCheckout(null);
      pushToast({
        title: "Top-up berhasil",
        description: `Saldo sekarang ${res.balance.balance} kredit.`,
        variant: "success",
      });
    } catch {
      pushToast({ title: "Top-up gagal", variant: "danger" });
    }
  };

  const openPackCheckout = (pack: {
    id: string;
    name: string;
    price: number;
    credits: number;
  }) => {
    setCheckout({
      kind: "pack",
      pack_id: pack.id,
      title: pack.name,
      amount: pack.price,
      detail: `+${pack.credits} kredit`,
    });
  };

  const openPlanCheckout = (plan: {
    id: PlanId;
    name: string;
    price_monthly: number;
  }) => {
    if (plan.id === "free" || plan.price_monthly === 0) {
      void onChangePlan(plan.id);
      return;
    }
    setCheckout({
      kind: "plan",
      plan_id: plan.id,
      title: `Plan ${plan.name}`,
      amount: plan.price_monthly,
      detail: "Langganan bulanan",
    });
  };

  const confirmCheckout = async (method: PaymentMethodCode) => {
    if (!checkout) return;
    if (checkout.kind === "pack") {
      await onBuy(checkout.pack_id, method);
    } else {
      await onChangePlan(checkout.plan_id as PlanId, method);
    }
  };

  const usedPct =
    balance && balance.period_grant > 0
      ? Math.round(
          ((balance.period_grant - balance.balance) / balance.period_grant) * 100
        )
      : 0;

  return (
    <div className="max-w-4xl mx-auto px-3 sm:px-5 py-5 space-y-5">
      <div>
        <h1 className="text-xl font-bold text-[var(--color-publiora-black)]">
          Billing & Credits
        </h1>
        <p className="text-sm text-[var(--color-medium-gray)] mt-0.5">
          Langganan + kredit untuk generate outline, section, title, dan CTA.
        </p>
      </div>

      {/* Balance */}
      <div className="grid md:grid-cols-2 gap-2.5">
        <Card>
          <CardBody className="space-y-3">
            <div className="flex items-center gap-2.5">
              <div className="h-8 w-8 rounded-lg bg-[var(--color-publiora-black)] text-white grid place-items-center">
                <Coins className="h-4 w-4" />
              </div>
              <div>
                <div className="text-[11px] uppercase tracking-wide text-[var(--color-medium-gray)]">
                  Saldo kredit
                </div>
                {lb ? (
                  <Skeleton className="h-7 w-20 mt-0.5" />
                ) : (
                  <div className="text-2xl font-bold tabular-nums text-[var(--color-publiora-black)]">
                    {balance?.balance ?? 0}
                  </div>
                )}
              </div>
            </div>
            {balance && (
              <>
                <div>
                  <div className="flex justify-between text-xs text-[var(--color-medium-gray)] mb-1">
                    <span>Pemakaian periode</span>
                    <span>
                      {Math.max(0, balance.period_grant - balance.balance)} /{" "}
                      {balance.period_grant}
                    </span>
                  </div>
                  <ProgressBar value={Math.min(100, Math.max(0, usedPct))} />
                </div>
                <p className="text-xs text-[var(--color-medium-gray)]">
                  Periode {formatDate(balance.period_start)} –{" "}
                  {formatDate(balance.period_end)} · Lifetime spent{" "}
                  {balance.lifetime_spent}
                </p>
              </>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardBody className="space-y-2.5">
            <div className="flex items-center gap-2.5">
              <div className="h-8 w-8 rounded-lg bg-[var(--color-surface-2)] border border-[var(--color-publiora-border)] grid place-items-center text-[var(--color-deep-gray)]">
                <CreditCard className="h-4 w-4" />
              </div>
              <div>
                <div className="text-[11px] uppercase tracking-wide text-[var(--color-medium-gray)]">
                  Subscription
                </div>
                {ls ? (
                  <Skeleton className="h-6 w-24 mt-0.5" />
                ) : (
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="text-lg font-bold capitalize text-[var(--color-publiora-black)]">
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
              <p className="text-xs text-[var(--color-medium-gray)]">
                Renews {formatDate(sub.renews_at)}
              </p>
            )}
            {costs && (
              <div className="rounded-lg bg-[var(--color-surface-2)] border border-[var(--color-publiora-border)] p-2.5 text-xs text-[var(--color-medium-gray)] space-y-0.5">
                <div className="font-medium text-[var(--color-deep-gray)] mb-0.5">
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
        <h2 className="text-xs font-semibold uppercase tracking-wide text-[var(--color-medium-gray)] mb-2.5">
          Plans
        </h2>
        {lp ? (
          <div className="grid md:grid-cols-3 gap-2.5">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-56" />
            ))}
          </div>
        ) : (
          <div className="grid md:grid-cols-3 gap-2.5">
            {(plans ?? []).map((plan) => {
              const current = sub?.plan_id === plan.id;
              return (
                <Card
                  key={plan.id}
                  className={cn(
                    current && "border-[var(--color-publiora-black)] shadow-[var(--shadow-card)]"
                  )}
                >
                  <CardBody className="space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="text-sm font-semibold text-[var(--color-publiora-black)]">
                          {plan.name}
                        </div>
                        <div className="mt-0.5 flex items-baseline gap-1">
                          <span className="text-xl font-bold">
                            {plan.price_monthly === 0
                              ? "Gratis"
                              : formatIdr(plan.price_monthly)}
                          </span>
                          {plan.price_monthly > 0 && (
                            <span className="text-xs text-[var(--color-medium-gray)]">
                              /bln
                            </span>
                          )}
                        </div>
                      </div>
                      {plan.featured && <Badge variant="gold">Popular</Badge>}
                      {current && <Badge variant="success">Current</Badge>}
                    </div>
                    <div className="text-xs text-[var(--color-medium-gray)]">
                      {plan.monthly_credits.toLocaleString()} kredit / bulan
                    </div>
                    <ul className="space-y-1.5 text-sm">
                      {plan.features.map((f) => (
                        <li key={f} className="flex items-start gap-1.5">
                          <Check className="h-3.5 w-3.5 text-[var(--color-success)] shrink-0 mt-0.5" />
                          <span className="text-[var(--color-deep-gray)]">{f}</span>
                        </li>
                      ))}
                    </ul>
                    <Button
                      size="sm"
                      className="w-full"
                      variant={current ? "outline" : plan.featured ? "primary" : "secondary"}
                      disabled={current || changePlan.isPending || buyPack.isPending}
                      loading={
                        changePlan.isPending &&
                        changePlan.variables?.plan_id === plan.id
                      }
                      onClick={() => openPlanCheckout(plan)}
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
        <h2 className="text-xs font-semibold uppercase tracking-wide text-[var(--color-medium-gray)] mb-2.5">
          Top-up kredit
        </h2>
        <div className="grid sm:grid-cols-3 gap-2.5">
          {(packs ?? []).map((pack) => (
            <Card key={pack.id}>
              <CardBody className="space-y-2.5">
                <div className="flex items-center justify-between gap-2">
                  <div className="text-sm font-semibold text-[var(--color-publiora-black)]">
                    {pack.name}
                  </div>
                  {pack.badge && <Badge variant="gold">{pack.badge}</Badge>}
                </div>
                <div className="text-xl font-bold text-[var(--color-publiora-black)]">
                  +{pack.credits}
                  <span className="text-xs font-medium text-[var(--color-medium-gray)] ml-1">
                    kredit
                  </span>
                </div>
                <div className="text-sm text-[var(--color-medium-gray)]">
                  {formatIdr(pack.price)}
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="w-full"
                  loading={
                    buyPack.isPending && buyPack.variables?.pack_id === pack.id
                  }
                  disabled={changePlan.isPending}
                  onClick={() => openPackCheckout(pack)}
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  Beli
                </Button>
              </CardBody>
            </Card>
          ))}
        </div>
        <p className="text-xs text-[var(--color-medium-gray)] mt-2">
          Pilih metode bayar di modal, lalu lanjut ke Duitku via PayCore. Kredit
          aktif setelah webhook payment.succeeded — bukan dari halaman return.
        </p>
      </section>

      <CheckoutPaymentModal
        open={!!checkout}
        onClose={() => {
          if (!changePlan.isPending && !buyPack.isPending) setCheckout(null);
        }}
        intent={checkout}
        loading={changePlan.isPending || buyPack.isPending}
        defaultMethod="BR"
        onConfirm={confirmCheckout}
      />

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
              <div className="px-4 pb-4 text-sm text-[var(--color-medium-gray)]">
                Belum ada transaksi.
              </div>
            ) : (
              <ul className="divide-y divide-[var(--color-publiora-border)]">
                {txns.map((t) => (
                  <li
                    key={t.id}
                    className="px-4 py-2.5 flex items-center justify-between gap-3 text-sm"
                  >
                    <div className="min-w-0">
                      <div className="font-medium text-[var(--color-deep-gray)] truncate">
                        {t.label}
                      </div>
                      <div className="text-xs text-[var(--color-medium-gray)]">
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
