"use client";

import * as React from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Card, CardBody } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Logo } from "@/components/ui/Logo";
import { CheckCircle2, Clock, AlertTriangle } from "lucide-react";

/**
 * PayCore return_url landing — UX only, NOT proof of payment.
 * Credits apply after payment.succeeded webhook.
 */
export default function BillingReturnPage() {
  const params = useSearchParams();
  const orderId = params.get("order_id") ?? params.get("orderId");
  const [status, setStatus] = React.useState<
    "checking" | "paid" | "pending" | "unknown"
  >("checking");

  React.useEffect(() => {
    if (!orderId) {
      setStatus("unknown");
      return;
    }
    let cancelled = false;
    let tries = 0;

    const poll = async () => {
      tries += 1;
      try {
        const res = await fetch(
          `/api/billing/orders/${encodeURIComponent(orderId)}`,
          { credentials: "same-origin" }
        );
        if (res.ok) {
          const body = (await res.json()) as { status?: string };
          if (body.status === "paid") {
            if (!cancelled) setStatus("paid");
            return;
          }
        }
      } catch {
        /* ignore */
      }
      if (tries >= 8) {
        if (!cancelled) setStatus("pending");
        return;
      }
      if (!cancelled) setTimeout(poll, 2000);
    };

    setStatus("checking");
    void poll();
    return () => {
      cancelled = true;
    };
  }, [orderId]);

  return (
    <div className="min-h-full flex flex-col bg-[var(--color-surface-2)]">
      <header className="border-b border-[var(--color-publiora-border)] bg-white">
        <div className="max-w-3xl mx-auto px-6 h-14 flex items-center">
          <Logo size="sm" href="/dashboard" />
        </div>
      </header>
      <main className="flex-1 grid place-items-center px-4 py-12">
        <Card className="max-w-md w-full">
          <CardBody className="text-center py-10 space-y-4">
            {status === "checking" && (
              <>
                <div className="h-12 w-12 rounded-2xl bg-[var(--color-surface-2)] grid place-items-center mx-auto text-[var(--color-medium-gray)]">
                  <Clock className="h-6 w-6 animate-pulse" />
                </div>
                <h1 className="text-xl font-bold text-[var(--color-publiora-black)]">
                  Memeriksa pembayaran…
                </h1>
                <p className="text-sm text-[var(--color-medium-gray)]">
                  Jangan tutup halaman. Kredit aktif setelah konfirmasi dari
                  gateway.
                </p>
              </>
            )}
            {status === "paid" && (
              <>
                <div className="h-12 w-12 rounded-2xl bg-[#ECFDF3] text-[var(--color-success)] grid place-items-center mx-auto">
                  <CheckCircle2 className="h-6 w-6" />
                </div>
                <h1 className="text-xl font-bold text-[var(--color-publiora-black)]">
                  Pembayaran berhasil
                </h1>
                <p className="text-sm text-[var(--color-medium-gray)]">
                  Kredit / plan sudah diaktifkan. Cek Billing untuk saldo terbaru.
                </p>
              </>
            )}
            {status === "pending" && (
              <>
                <div className="h-12 w-12 rounded-2xl bg-[#FFFBEB] text-[var(--color-gold)] grid place-items-center mx-auto">
                  <Clock className="h-6 w-6" />
                </div>
                <h1 className="text-xl font-bold text-[var(--color-publiora-black)]">
                  Menunggu konfirmasi
                </h1>
                <p className="text-sm text-[var(--color-medium-gray)]">
                  Pembayaran masih diproses. Saldo akan muncul otomatis setelah
                  webhook PayCore. Refresh Billing dalam beberapa menit.
                </p>
                {orderId && (
                  <p className="text-xs text-[var(--color-soft-gray)] font-mono break-all">
                    Order: {orderId}
                  </p>
                )}
              </>
            )}
            {status === "unknown" && (
              <>
                <div className="h-12 w-12 rounded-2xl bg-[#FEF2F2] text-[var(--color-danger)] grid place-items-center mx-auto">
                  <AlertTriangle className="h-6 w-6" />
                </div>
                <h1 className="text-xl font-bold text-[var(--color-publiora-black)]">
                  Tidak ada order
                </h1>
                <p className="text-sm text-[var(--color-medium-gray)]">
                  Parameter order_id hilang. Buka Billing untuk cek status.
                </p>
              </>
            )}
            <div className="flex flex-col sm:flex-row gap-2 justify-center pt-2">
              <Link href="/settings/billing">
                <Button>Ke Billing</Button>
              </Link>
              <Link href="/dashboard">
                <Button variant="outline">Dashboard</Button>
              </Link>
            </div>
          </CardBody>
        </Card>
      </main>
    </div>
  );
}
