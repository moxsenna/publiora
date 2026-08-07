import { sectionStatusLabelsId } from "@/lib/i18n/id/common";

export const workspaceId = {
  sections: "Bagian",
  generateAll: "Tulis semua",
  generating: "Sedang menulis…",
  generate: "Tulis",
  regenerate: "Tulis ulang",
  generateOutline: "Buat Outline",
  writeSections: "Tulis Bagian",
  reviewEbook: "Tinjau Ebook",
  publishEbook: "Terbitkan Ebook",
  save: "Simpan",
  cancel: "Batal",
  preview: "Pratinjau",
  activeSection: "Bagian aktif",
  selectSection: "Pilih bagian",
  noOutlineTitle: "Outline belum ada",
  noOutlineDesc: "Buat outline terlebih dahulu sebelum menulis bagian.",
  noSectionTitle: "Belum ada bagian yang ditulis",
  noSectionDesc: "Pilih bagian, lalu tulis untuk mulai menyunting.",
  sectionSaved: "Bagian disimpan",
  saveFailed: "Gagal menyimpan",
  generateFailed: "Gagal menulis bagian",
  saveFirst: "Simpan terlebih dahulu",
  saveFirstDesc: "Perubahan pada bagian aktif belum tersimpan.",
  cannotSwitch: "Belum dapat berpindah bagian",
  cannotSwitchDesc: "Perubahan gagal disimpan. Coba lagi.",
  enhancementApplied: "Saran diterapkan",
  contentRestored: "Konten dikembalikan ke versi sebelumnya",
  outlineApproved: "Outline disetujui. Lanjutkan ke tahap Tulis.",
  approveOutline: "Setujui outline",
  continueToWrite: "Lanjut ke Tulis",
  newSection: "Bagian",
  draft: "Draf",
  approved: "Disetujui",
  sectionStatus: sectionStatusLabelsId,

  // Editor kaya
  editorLoading: "Memuat editor…",
  toolbar: {
    bold: "Tebal",
    italic: "Miring",
    bulletList: "Daftar poin",
    orderedList: "Daftar bernomor",
    quote: "Kutipan",
    undo: "Urungkan",
    redo: "Ulangi",
  },

  // Komposer CTA
  ctaHeading: "Ajakan Bertindak (CTA)",
  ctaGoalLabel: "Tujuan",
  ctaGoalLabels: {
    visit_product: "Kunjungi Halaman Produk",
    join_whatsapp: "Gabung Komunitas WhatsApp",
    claim_bonus: "Klaim Bonus / Unduhan",
    buy_product: "Beli Produk",
    follow_creator: "Ikuti Kreator",
    custom: "CTA Kustom",
  },
  ctaGoalDescriptions: {
    visit_product: "Arahkan pembaca ke produk atau halaman arahan Anda.",
    join_whatsapp: "Ajak pembaca bergabung ke grup atau komunitas WhatsApp.",
    claim_bonus: "Tawarkan bonus atau unduhan sebagai imbalan.",
    buy_product: "Dorong pembelian langsung.",
    follow_creator: "Kembangkan pengikut media sosial Anda.",
    custom: "Tentukan ajakan bertindak kustom Anda sendiri.",
  },
  placementLabels: {
    ebook_end: "Akhir ebook",
    claim_page: "Hanya halaman klaim",
    both: "Keduanya",
  },
  ctaUrlRequiredTitle: "URL wajib diisi",
  ctaUrlRequiredDesc:
    "Masukkan tujuan https:// yang valid sebelum membuat saran CTA.",
  ctaApplied: "CTA diterapkan",
  ctaUrlInvalid: "Masukkan URL yang valid",
  ctaSaved: "CTA disimpan",
  ctaSaveFailed: "Gagal menyimpan CTA",
  saveCta: "Simpan CTA",
  currentCta: "Saat ini: ",
  suggestions: "Saran",
  copy: "Salin",
  ctaEmptyHint:
    "Atur tujuan lalu klik Buat saran untuk mendapatkan saran CTA bertenaga AI berdasarkan konten ebook Anda.",

  // Panel outline
  outlineCreated: "Outline dibuat",
  strategyNotReadyTitle: "Strategi belum siap",
  strategyNotReadyDesc: "Lengkapi strategi sebelum membuat outline.",
  creditsInsufficientTitle: "Kredit tidak cukup",
  creditsInsufficientDesc: "Buka Tagihan untuk isi ulang atau tingkatkan paket Anda.",
  outlineGenerateFailed: "Gagal membuat outline",
  generateOutlineFromStrategy: "Buat outline dari strategi yang sudah disetujui.",
  generateOutlineBtn: "Buat outline",
  approveFailed: "Gagal menyetujui outline",
  addSection: "Bagian",
  approveHint: (min: number, current: number) =>
    `Tambahkan minimal ${min} bagian berjudul untuk menyetujui. Saat ini: ${current}.`,
  regenerateOutline: "Buat ulang",
  regenerateInstructionPlaceholder: "Instruksi opsional untuk membuat ulang…",
  regenerateResetTitle: "Buat ulang dan setel ulang bagian tertulis",
  regenerateResetDesc:
    "Outline ini sudah memiliki bagian yang sudah ditulis. Membuat ulang akan menghapus semua bagian tertulis secara permanen. Tindakan ini tidak dapat dibatalkan.",
  regenerateResetAction: "Buat ulang dan setel ulang",
  regenerateResetWarning:
    "Semua konten bagian yang dibuat sebelumnya akan hilang. Pastikan Anda benar-benar ingin membuat ulang seluruh outline.",
  sectionTitlePlaceholder: "Judul bagian…",
  sectionSummaryPlaceholder: "Ringkasan isi bagian…",
  newSectionTitle: "Bagian baru",

  // Pratinjau
  previewUnavailable: "Pratinjau belum tersedia",
  previewEmptyDesc: "Buat bagian di tab Bagian untuk melihat pratinjau ebook.",
  previewAsReader: "Pratinjau sebagai pembaca",
  previewOpenFull: "Buka pratinjau lengkap",
  previewSectionCount: "bagian siap dibaca",

  // Saran judul
  titleApplied: "Diterapkan",
  useThisTitle: "Gunakan judul ini",
  titleEmptyHint:
    "Klik Buat saran untuk mendapatkan saran judul bertenaga AI berdasarkan strategi Anda.",
} as const;

export const workflowStepLabelsId = {
  strategy: "Strategi",
  outline: "Outline",
  write: "Tulis",
  review: "Tinjau",
  publish: "Terbit",
} as const;

export type WorkflowBlockerCopy = {
  title: string;
  description: string;
  action: string;
};

const blockerCopy: Record<string, WorkflowBlockerCopy> = {
  strategy_incomplete: {
    title: "Strategi belum siap",
    description: "Lengkapi strategi sebelum membuat outline.",
    action: "Buka Strategi",
  },
  outline_missing: {
    title: "Outline belum siap",
    description: "Buat dan setujui outline sebelum menulis bagian.",
    action: "Buka Outline",
  },
  outline_not_approved: {
    title: "Outline belum disetujui",
    description: "Tinjau dan setujui outline sebelum menulis bagian.",
    action: "Buka Outline",
  },
  outline_insufficient_sections: {
    title: "Outline belum lengkap",
    description: "Tambahkan minimal tiga bagian berjudul sebelum melanjutkan.",
    action: "Buka Outline",
  },
  title_empty: {
    title: "Judul ebook belum ada",
    description: "Tambahkan judul sebelum menerbitkan ebook.",
    action: "Buka Tinjau",
  },
  cta_text_empty: {
    title: "CTA belum lengkap",
    description: "Tambahkan teks CTA sebelum menerbitkan ebook.",
    action: "Buka Tinjau",
  },
  cta_url_invalid: {
    title: "URL CTA belum valid",
    description: "Periksa URL tujuan CTA sebelum menerbitkan ebook.",
    action: "Buka Tinjau",
  },
  cta_url_missing_or_invalid: {
    title: "URL CTA diperlukan",
    description: "Tambahkan URL tujuan yang valid untuk CTA pilihan Anda.",
    action: "Buka Tinjau",
  },
};

export function getWorkflowBlockerCopy(code: string): WorkflowBlockerCopy {
  if (code.startsWith("missing_section_") || code.startsWith("incomplete_section_") || code.startsWith("failed_section_") || code.startsWith("empty_section_")) {
    return {
      title: "Bagian belum siap",
      description: "Semua bagian harus selesai ditulis sebelum ditinjau.",
      action: "Buka tahap terkait",
    };
  }
  return blockerCopy[code] ?? {
    title: "Tahap belum siap",
    description: "Selesaikan persyaratan tahap sebelumnya untuk melanjutkan.",
    action: "Buka tahap terkait",
  };
}
