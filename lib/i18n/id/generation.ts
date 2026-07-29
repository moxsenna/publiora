export const generationId = {
  startWriting: "Mulai menulis bagian?",
  willWrite: (n: number) => `Akan menulis ${n} bagian`,
  cost: (n: number) => `Biaya: ${n} kredit`,
  balance: (n: number) => `Saldo saat ini: ${n}`,
  remaining: (n: number) => `Sisa perkiraan: ${n}`,
  insufficient:
    "Kredit tidak cukup untuk semua bagian. Isi kredit atau tulis bagian satu per satu.",
  allDone: "Semua bagian sudah selesai ditulis.",
  cancel: "Batalkan",
  start: "Mulai menulis",
  progress: (current: number, total: number) =>
    `Menulis ebook · ${current} dari ${total}`,
  stopAfter: "Hentikan setelah bagian ini",
  willStop: "Akan berhenti setelah bagian ini",
  retry: "Coba ulang",
  skip: "Lewati dan lanjutkan",
  stop: "Hentikan",
  close: "Tutup",
  failedSection: "Bagian gagal ditulis",
  completed: (n: number) => `Selesai. ${n} bagian berhasil.`,
  stopped: (n: number) =>
    `Dihentikan setelah bagian saat ini. ${n} bagian berhasil.`,
  rewriteConfirmTitle: "Tulis ulang bagian ini?",
  rewriteConfirmDesc:
    "Konten saat ini akan disimpan sebagai versi sebelumnya, lalu diganti dengan hasil baru.",
  rewriteConfirmAction: "Tulis ulang",
} as const;
