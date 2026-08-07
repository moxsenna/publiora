const integerId = new Intl.NumberFormat("id-ID", { maximumFractionDigits: 0 });

export const billingId = {
  title: "Tagihan dan kredit",
  credit: "kredit",
  subscription: "Langganan",
  payment: "Pembayaran",
  emailPreferences: "Preferensi email",
  emailPreferencesDescription: "Pembaruan produk dipilih sendiri dan dapat diubah kapan saja.",
  emailMarketingLabel: "Tips membuat ebook dan informasi produk",
  emailPreferencesNote:
    "Email pemasaran hanya dikirim jika kotak di atas dicentang. Perubahan tidak memengaruhi asal akun atau riwayat aktivasi.",
  emailPreferencesSaved: "Preferensi email diperbarui.",
  emailPreferencesFailed: "Preferensi email gagal disimpan.",
  return: {
    checkingTitle: "Memeriksa pembayaran…",
    checkingBody: "Jangan tutup halaman. Kredit aktif setelah konfirmasi dari gateway.",
    paidTitle: "Pembayaran berhasil",
    paidBody: "Kredit / plan sudah diaktifkan. Cek Tagihan untuk saldo terbaru.",
    pendingTitle: "Menunggu konfirmasi",
    pendingBody:
      "Pembayaran masih diproses. Saldo akan muncul otomatis setelah pembayaran dikonfirmasi. Refresh Tagihan dalam beberapa menit.",
    failedTitle: "Pembayaran gagal",
    failedBody:
      "Pembayaran tidak berhasil diproses. Buat pesanan baru dari halaman Tagihan.",
    expiredTitle: "Pembayaran kedaluwarsa",
    expiredBody:
      "Batas waktu pembayaran sudah lewat. Buat pesanan baru dari halaman Tagihan.",
    canceledTitle: "Pembayaran dibatalkan",
    canceledBody: "Pesanan dibatalkan. Buat pesanan baru dari halaman Tagihan.",
    unknownTitle: "Tidak ada order",
    unknownBody: "Parameter order_id hilang. Buka Tagihan untuk cek status.",
    backToBilling: "Ke Tagihan",
    dashboard: "Dasbor",
  },
} as const;

/** Raw pack badge values from the billing catalog, mapped at the UI boundary. */
const packBadgeCopyId: Record<string, string> = {
  "Best value": "Nilai terbaik",
  Populer: "Populer",
};

export function getPackBadgeCopy(badge?: string): string | null {
  if (!badge) return null;
  return packBadgeCopyId[badge] ?? null;
}

const billingDateFormatter = new Intl.DateTimeFormat("id-ID", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});

export function formatBillingDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return billingDateFormatter.format(date);
}

export function formatBillingRelativeTime(iso: string, now = new Date()): string {
  const timestamp = new Date(iso).getTime();
  if (Number.isNaN(timestamp)) return "";
  const seconds = Math.max(0, Math.round((now.getTime() - timestamp) / 1000));
  if (seconds < 45) return "baru saja";
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} menit lalu`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} jam lalu`;
  const days = Math.round(hours / 24);
  if (days < 7) return `${days} hari lalu`;
  if (days < 28) return `${Math.round(days / 7)} minggu lalu`;
  return formatBillingDate(iso);
}

export function formatSectionCount(count: number): string {
  return `${integerId.format(count)} bagian`;
}

export function formatReaderCount(count: number): string {
  return `${integerId.format(count)} pembaca`;
}

export function formatCreditBalance(balance: number): string {
  return `${integerId.format(balance)} kredit`;
}
