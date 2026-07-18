"use client";

import * as React from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import {
  CHECKOUT_PAYMENT_METHODS,
  type PaymentMethodCode,
} from "@/lib/paycore/methods";
import { cn } from "@/lib/utils";
import { Building2, QrCode, Store } from "lucide-react";

function formatIdr(amount: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(amount);
}

const groupIcon = {
  qris: QrCode,
  va: Building2,
  retail: Store,
} as const;

const groupLabel = {
  qris: "QRIS / E-wallet",
  va: "Virtual Account",
  retail: "Retail",
} as const;

export type CheckoutIntent =
  | {
      kind: "pack";
      pack_id: string;
      title: string;
      amount: number;
      detail?: string;
    }
  | {
      kind: "plan";
      plan_id: string;
      title: string;
      amount: number;
      detail?: string;
    };

export function CheckoutPaymentModal({
  open,
  onClose,
  intent,
  loading,
  defaultMethod = "BR",
  onConfirm,
}: {
  open: boolean;
  onClose: () => void;
  intent: CheckoutIntent | null;
  loading?: boolean;
  defaultMethod?: PaymentMethodCode;
  onConfirm: (method: PaymentMethodCode) => void | Promise<void>;
}) {
  const [method, setMethod] = React.useState<PaymentMethodCode>(defaultMethod);

  React.useEffect(() => {
    if (open) setMethod(defaultMethod);
  }, [open, defaultMethod, intent?.kind, intent && "pack_id" in intent ? intent.pack_id : intent && "plan_id" in intent ? intent.plan_id : ""]);

  if (!intent) return null;

  const groups = (["qris", "va", "retail"] as const).map((g) => ({
    key: g,
    label: groupLabel[g],
    Icon: groupIcon[g],
    items: CHECKOUT_PAYMENT_METHODS.filter((m) => m.group === g),
  }));

  return (
    <Modal
      open={open}
      onClose={loading ? () => {} : onClose}
      title="Pilih metode pembayaran"
      description={`${intent.title}${intent.detail ? ` · ${intent.detail}` : ""}`}
      size="lg"
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Batal
          </Button>
          <Button
            loading={loading}
            onClick={() => void onConfirm(method)}
          >
            Lanjut bayar {formatIdr(intent.amount)}
          </Button>
        </>
      }
    >
      <div className="space-y-5 max-h-[min(60vh,28rem)] overflow-y-auto pr-1">
        <div className="rounded-xl border border-[var(--color-publiora-border)] bg-[var(--color-surface-2)] px-4 py-3 flex items-center justify-between gap-3">
          <div className="text-sm text-[var(--color-medium-gray)]">Total</div>
          <div className="text-lg font-bold text-[var(--color-publiora-black)]">
            {formatIdr(intent.amount)}
          </div>
        </div>

        {groups.map(({ key, label, Icon, items }) =>
          items.length === 0 ? null : (
            <section key={key}>
              <div className="flex items-center gap-2 mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--color-soft-gray)]">
                <Icon className="h-3.5 w-3.5" />
                {label}
              </div>
              <div className="grid sm:grid-cols-2 gap-2">
                {items.map((m) => {
                  const active = method === m.code;
                  return (
                    <button
                      key={m.code}
                      type="button"
                      onClick={() => setMethod(m.code)}
                      disabled={loading}
                      className={cn(
                        "text-left rounded-xl border px-3 py-3 transition-colors",
                        active
                          ? "border-[var(--color-publiora-black)] bg-[var(--color-publiora-black)]/5 ring-1 ring-[var(--color-publiora-black)]"
                          : "border-[var(--color-publiora-border)] hover:border-[var(--color-medium-gray)] bg-white"
                      )}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="text-sm font-semibold text-[var(--color-publiora-black)]">
                            {m.label}
                          </div>
                          <div className="text-xs text-[var(--color-medium-gray)] mt-0.5">
                            {m.description}
                          </div>
                        </div>
                        <span
                          className={cn(
                            "mt-0.5 h-4 w-4 rounded-full border shrink-0",
                            active
                              ? "border-[var(--color-publiora-black)] bg-[var(--color-publiora-black)]"
                              : "border-[var(--color-soft-gray)]"
                          )}
                        />
                      </div>
                    </button>
                  );
                })}
              </div>
            </section>
          )
        )}

        <p className="text-xs text-[var(--color-soft-gray)] leading-relaxed">
          Pembayaran diproses PayCore (Duitku). Kredit / plan aktif setelah
          pembayaran dikonfirmasi — bukan hanya dari halaman return.
        </p>
      </div>
    </Modal>
  );
}
