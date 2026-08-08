import { getClaimEventStatusCopy } from "./status";

export const publishedId = {
  back: "Kembali ke dasbor",
  reader: "Buka reader",
  tabs: { claims: "Tautan klaim", exports: "Ekspor", info: "Informasi" },
  counters: { readers: "pembaca", claims: "klaim aktif", sections: "bagian" },
  actions: {
    createClaim: "Buat tautan klaim", create: "Buat tautan", cancel: "Batal",
    events: "Event", revoke: "Cabut", delete: "Hapus", retry: "Coba lagi", download: "Unduh",
  },
  claims: {
    empty: "Belum ada tautan klaim", emptyDescription: "Buat tautan untuk dibagikan kepada audiens.",
    loadError: "Tautan klaim belum dapat dimuat.", eventsEmpty: "Belum ada event klaim.",
    eventsError: "Event klaim belum dapat dimuat.", eventCaption: "Event klaim",
    reader: "Pembaca", status: "Status", time: "Waktu", used: "digunakan", slots: "slot",
    expires: "Kedaluwarsa", created: "Dibuat",
    revokeTitle: "Cabut tautan klaim?", revokeDescription: "Tautan ini tidak dapat dipakai lagi setelah dicabut.",
    revokeConfirm: "Ya, cabut tautan", deleteTitle: "Hapus tautan klaim?",
    deleteDescription: "Tautan dan riwayat terkait akan dihapus permanen.", deleteConfirm: "Ya, hapus tautan",
    revokedToast: "Tautan dicabut", deletedToast: "Tautan dihapus",
    createTitle: "Buat tautan klaim", createDescription: "Token unik akan dibuat oleh server untuk memberi akses ebook.",
    label: "Label", labelPlaceholder: "Mis. Peluncuran newsletter", labelRequired: "Label wajib diisi.",
    maxUses: "Batas penggunaan (opsional)", maxPlaceholder: "Tanpa batas", maxError: "Batas penggunaan minimal 1.",
    expiresDays: "Masa berlaku dalam hari (opsional)", expiresPlaceholder: "Tidak pernah", expiresError: "Masa berlaku minimal 1 hari.",
    createdToast: "Tautan klaim dibuat", createError: "Tautan klaim gagal dibuat.",
  },
  exports: {
    title: "Ekspor ebook", empty: "Belum ada ekspor", emptyDescription: "Mulai ekspor PDF, EPUB, atau DOCX.",
    loadError: "Riwayat ekspor belum dapat dimuat.", createError: "Ekspor gagal dimulai.",
    started: "Ekspor dimulai", caption: "Riwayat ekspor", format: "Format", status: "Status", created: "Dibuat", action: "Aksi",
  },
  info: {
    title: "Informasi ebook", description: "Detail publikasi.", caption: "Informasi publikasi",
    id: "ID", slug: "Slug", author: "Penulis", published: "Diterbitkan", sections: "Bagian", visibility: "Visibilitas",
    public: "Publik", private: "Privat",
  },
  page: { loadError: "Publikasi belum dapat dimuat.", missing: "Publikasi tidak ditemukan." },
  dateUnavailable: "Tanggal tidak tersedia",
} as const;

export function formatPublishedDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return publishedId.dateUnavailable;
  return new Intl.DateTimeFormat("id-ID", { dateStyle: "medium", timeStyle: "short" }).format(date);
}

export function getPublishedClaimEventLabel(status: unknown): string {
  return getClaimEventStatusCopy(status).label;
}
