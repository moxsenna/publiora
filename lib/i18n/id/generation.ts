export const generationId = {
  startWriting: "Mulai menulis section?",
  willWrite: (n: number) => `Akan menulis ${n} section`,
  cost: (n: number) => `Biaya: ${n} kredit`,
  balance: (n: number) => `Saldo saat ini: ${n}`,
  remaining: (n: number) => `Sisa perkiraan: ${n}`,
  insufficient:
    "Kredit tidak cukup untuk semua section. Isi kredit atau tulis section satu per satu.",
  allDone: "Semua section sudah selesai ditulis.",
  cancel: "Batalkan",
  start: "Mulai menulis",
  progress: (current: number, total: number) =>
    `Menulis ebook · ${current} dari ${total}`,
  stopAfter: "Hentikan setelah section ini",
  willStop: "Akan berhenti setelah section ini",
  retry: "Coba ulang",
  skip: "Lewati dan lanjutkan",
  stop: "Hentikan",
  close: "Tutup",
  failedSection: "Section gagal ditulis",
  completed: (n: number) => `Selesai. ${n} section berhasil.`,
  stopped: (n: number) =>
    `Dihentikan setelah section saat ini. ${n} section berhasil.`,
  rewriteConfirmTitle: "Tulis ulang section ini?",
  rewriteConfirmDesc:
    "Konten saat ini akan disimpan sebagai versi sebelumnya, lalu diganti dengan hasil baru.",
  rewriteConfirmAction: "Tulis ulang",
} as const;
