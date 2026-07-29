const integerId = new Intl.NumberFormat("id-ID", { maximumFractionDigits: 0 });

export const billingId = {
  title: "Tagihan dan kredit",
  credit: "kredit",
  subscription: "Langganan",
  payment: "Pembayaran",
} as const;

export function formatSectionCount(count: number): string {
  return `${integerId.format(count)} bagian`;
}

export function formatReaderCount(count: number): string {
  return `${integerId.format(count)} pembaca`;
}

export function formatCreditBalance(balance: number): string {
  return `${integerId.format(balance)} kredit`;
}
