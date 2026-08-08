import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  billingId,
  formatBillingDate,
  formatBillingRelativeTime,
  formatCreditBalance,
  formatReaderCount,
  formatSectionCount,
  getCreditTransactionTypeCopy,
  getPackBadgeCopy,
  getPaymentOrderStatusCopy,
  getSubscriptionStatusCopy,
} from "@/lib/i18n/id";

describe("Indonesian number formatters", () => {
  it("formats section and reader counts with id-ID numerals", () => {
    expect(formatSectionCount(1234)).toBe("1.234 bagian");
    expect(formatReaderCount(5678)).toBe("5.678 pembaca");
  });

  it("formats credit balance with id-ID numerals", () => {
    expect(formatCreditBalance(987654)).toBe("987.654 kredit");
  });
});

describe("billing catalog labels", () => {
  it("provides the required Indonesian labels", () => {
    expect(billingId.title).toBe("Tagihan dan kredit");
    expect(billingId.subscription).toBe("Langganan");
    expect(billingId.payment).toBe("Pembayaran");
    expect(billingId.credit).toBe("kredit");
  });

  it("keeps return-state copy distinct across paid/failed/expired/canceled", () => {
    const returnId = billingId.return;
    const titles = [
      returnId.paidTitle,
      returnId.failedTitle,
      returnId.expiredTitle,
      returnId.canceledTitle,
    ];
    expect(new Set(titles).size).toBe(titles.length);
    expect(returnId.failedTitle).toMatch(/gagal/i);
    expect(returnId.expiredTitle).toMatch(/kedaluwarsa/i);
    expect(returnId.canceledTitle).toMatch(/dibatalkan/i);
    expect(returnId.backToBilling).toBe("Ke Tagihan");
    expect(returnId.dashboard).toBe("Dasbor");
  });
});

describe("billing status mapping", () => {
  it("maps order statuses to distinct Indonesian copy", () => {
    const failed = getPaymentOrderStatusCopy("failed");
    const expired = getPaymentOrderStatusCopy("expired");
    const canceled = getPaymentOrderStatusCopy("canceled");
    const paid = getPaymentOrderStatusCopy("paid");
    expect(failed.label).toBe("Gagal");
    expect(expired.label).toBe("Kedaluwarsa");
    expect(canceled.label).toBe("Dibatalkan");
    expect(paid.label).toBe("Lunas");
    expect(new Set([failed.label, expired.label, canceled.label, paid.label]).size).toBe(4);
    expect(failed.tone).toBe("danger");
  });

  it("maps subscription statuses and credit transaction types", () => {
    expect(getSubscriptionStatusCopy("active").label).toBe("Aktif");
    expect(getSubscriptionStatusCopy("past_due").label).toBe("Pembayaran terlambat");
    expect(getCreditTransactionTypeCopy("spend").label).toBe("Kredit digunakan");
    expect(getCreditTransactionTypeCopy("purchase").label).toBe("Pembelian kredit");
  });
});

describe("pack badge UI boundary", () => {
  it("maps raw plan catalog badges to Indonesian copy at the boundary", () => {
    expect(getPackBadgeCopy("Best value")).toBe("Nilai terbaik");
    expect(getPackBadgeCopy("Populer")).toBe("Populer");
    expect(getPackBadgeCopy(undefined)).toBeNull();
    expect(getPackBadgeCopy("Unlisted badge")).toBeNull();
  });
});

describe("billing id-ID date formatting", () => {
  it("formats absolute dates with id-ID short months in UTC", () => {
    expect(formatBillingDate("2026-07-17T00:00:00.000Z")).toBe("17 Jul 2026");
    expect(formatBillingDate("2026-08-01T00:00:00.000Z")).toBe("1 Agu 2026");
  });

  it("formats relative times in Indonesian", () => {
    const now = new Date("2026-08-01T10:00:00.000Z");
    expect(formatBillingRelativeTime("2026-08-01T09:55:00.000Z", now)).toBe("5 menit lalu");
    expect(formatBillingRelativeTime("2026-08-01T07:00:00.000Z", now)).toBe("3 jam lalu");
    expect(formatBillingRelativeTime("2026-07-30T10:00:00.000Z", now)).toBe("2 hari lalu");
    expect(formatBillingRelativeTime("2026-07-11T10:00:00.000Z", now)).toBe("3 minggu lalu");
    expect(formatBillingRelativeTime("2026-06-01T10:00:00.000Z", now)).toBe("1 Jun 2026");
  });
});

describe("billing presentation boundaries", () => {
  const presentationFiles = [
    "app/(app)/settings/billing/page.tsx",
    "app/billing/return/page.tsx",
    "components/billing/CheckoutPaymentModal.tsx",
  ];

  it("does not leak gateway mechanics into user-facing copy", () => {
    for (const file of presentationFiles) {
      const source = fs.readFileSync(path.join(process.cwd(), file), "utf8");
      expect(source, file).not.toMatch(/webhook|payment\.succeeded|payment-events|halaman return/i);
    }
  });

  it("does not show the raw order id in the return page", () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), "app/billing/return/page.tsx"),
      "utf8",
    );
    expect(source).not.toMatch(/Order:\s*\{/i);
  });
});
