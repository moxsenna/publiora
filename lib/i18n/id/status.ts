import type { BadgeProps } from "@/components/ui/Badge";
import type { CreditTxnType, Subscription } from "@/types/billing";
import type { PaymentOrderStatus } from "@/types/billing-order";
import type { ClaimEvent, ClaimLinkStatus } from "@/types/claim-link";
import type { ExportStatus } from "@/types/export";
import type { OfferStatus } from "@/types/offer";
import type { ProjectStatus } from "@/types/project";

export type StatusCopy = Readonly<{
  label: string;
  tone: NonNullable<BadgeProps["variant"]>;
}>;

export type ClaimEventStatus = ClaimEvent["status"];
export type SubscriptionStatus = Subscription["status"];

export const unknownStatusCopyId = {
  label: "Status tidak diketahui",
  tone: "default",
} as const satisfies StatusCopy;

export const projectStatusCopyId = {
  draft: { label: "Draf", tone: "default" },
  outline_draft: { label: "Draf outline", tone: "warning" },
  approved: { label: "Disetujui", tone: "info" },
  generating: { label: "Sedang dibuat", tone: "info" },
  generated: { label: "Selesai dibuat", tone: "success" },
  publishing: { label: "Sedang diterbitkan", tone: "warning" },
  published: { label: "Terbit", tone: "success" },
  failed: { label: "Gagal", tone: "danger" },
} as const satisfies Record<ProjectStatus, StatusCopy>;

export const claimLinkStatusCopyId = {
  active: { label: "Aktif", tone: "success" },
  expired: { label: "Kedaluwarsa", tone: "default" },
  revoked: { label: "Dicabut", tone: "danger" },
} as const satisfies Record<ClaimLinkStatus, StatusCopy>;

export const claimEventStatusCopyId = {
  claimed: { label: "Diklaim", tone: "success" },
  already_owned: { label: "Sudah dimiliki", tone: "info" },
  expired: { label: "Kedaluwarsa", tone: "default" },
  revoked: { label: "Dicabut", tone: "danger" },
  limit_reached: { label: "Batas tercapai", tone: "warning" },
} as const satisfies Record<ClaimEventStatus, StatusCopy>;

export const exportStatusCopyId = {
  queued: { label: "Dalam antrean", tone: "default" },
  processing: { label: "Diproses", tone: "info" },
  complete: { label: "Selesai", tone: "success" },
  failed: { label: "Gagal", tone: "danger" },
} as const satisfies Record<ExportStatus, StatusCopy>;

export const subscriptionStatusCopyId = {
  active: { label: "Aktif", tone: "success" },
  canceled: { label: "Dibatalkan", tone: "default" },
  past_due: { label: "Pembayaran terlambat", tone: "danger" },
  trialing: { label: "Masa percobaan", tone: "info" },
} as const satisfies Record<SubscriptionStatus, StatusCopy>;

export const paymentOrderStatusCopyId = {
  pending: { label: "Menunggu pembayaran", tone: "warning" },
  paid: { label: "Lunas", tone: "success" },
  failed: { label: "Gagal", tone: "danger" },
  expired: { label: "Kedaluwarsa", tone: "default" },
  canceled: { label: "Dibatalkan", tone: "default" },
} as const satisfies Record<PaymentOrderStatus, StatusCopy>;

export const creditTransactionTypeCopyId = {
  grant: { label: "Kredit diberikan", tone: "success" },
  purchase: { label: "Pembelian kredit", tone: "gold" },
  spend: { label: "Kredit digunakan", tone: "info" },
  refund: { label: "Pengembalian kredit", tone: "success" },
  adjust: { label: "Penyesuaian kredit", tone: "default" },
} as const satisfies Record<CreditTxnType, StatusCopy>;

export const offerStatusCopyId = {
  active: { label: "Aktif", tone: "success" },
  archived: { label: "Diarsipkan", tone: "default" },
} as const satisfies Record<OfferStatus, StatusCopy>;

function fromBoundary<T extends string>(value: unknown, catalog: Record<T, StatusCopy>): StatusCopy {
  return typeof value === "string" && Object.prototype.hasOwnProperty.call(catalog, value)
    ? catalog[value as T]
    : unknownStatusCopyId;
}

export const getProjectStatusCopy = (status: unknown) => fromBoundary(status, projectStatusCopyId);
export const getClaimLinkStatusCopy = (status: unknown) => fromBoundary(status, claimLinkStatusCopyId);
export const getClaimEventStatusCopy = (status: unknown) => fromBoundary(status, claimEventStatusCopyId);
export const getExportStatusCopy = (status: unknown) => fromBoundary(status, exportStatusCopyId);
export const getSubscriptionStatusCopy = (status: unknown) => fromBoundary(status, subscriptionStatusCopyId);
export const getPaymentOrderStatusCopy = (status: unknown) => fromBoundary(status, paymentOrderStatusCopyId);
export const getCreditTransactionTypeCopy = (type: unknown) => fromBoundary(type, creditTransactionTypeCopyId);
export const getOfferStatusCopy = (status: unknown) => fromBoundary(status, offerStatusCopyId);
