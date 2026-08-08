export const libraryId = {
  title: "Pustaka",
  description: "Ebook yang sudah Anda klaim. Akses kapan saja.",
  count: (total: number) => `${total} ebook`,
  emptyTitle: "Pustaka masih kosong",
  emptyDescription: "Klaim ebook melalui tautan akses untuk menambahkannya.",
  dashboard: "Ke dasbor",
  section: "Bagian",
  by: "oleh",
  read: "Baca",
  continue: "Lanjutkan",
  readAt: "Dibaca",
} as const;

export type ReadingStateCopy = Readonly<{ label: string; progressLabel: string }>;

export function getReadingStateCopy(progress: number): ReadingStateCopy {
  const safeProgress = Math.max(0, Math.min(100, Number.isFinite(progress) ? progress : 0));
  if (safeProgress >= 100) return { label: "Selesai", progressLabel: "Selesai" };
  if (safeProgress > 0) return { label: "Sedang dibaca", progressLabel: `${safeProgress}% selesai` };
  return { label: "Belum dibaca", progressLabel: "Belum dibaca" };
}
