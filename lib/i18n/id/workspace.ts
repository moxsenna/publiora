import { sectionStatusLabelsId } from "@/lib/i18n/id/common";

export const workspaceId = {
  sections: "Sections",
  generateAll: "Tulis semua",
  generating: "Menulis…",
  generate: "Tulis",
  regenerate: "Tulis ulang",
  save: "Simpan",
  activeSection: "Section aktif",
  selectSection: "Pilih section",
  noOutlineTitle: "Outline belum ada",
  noOutlineDesc: "Buat outline dulu sebelum menulis section.",
  noSectionTitle: "Belum ada section ter-generate",
  noSectionDesc: "Pilih section di navigator, lalu generate untuk mulai menulis.",
  sectionSaved: "Section disimpan",
  saveFailed: "Simpan gagal",
  generateFailed: "Generate gagal",
  saveFirst: "Simpan dulu",
  saveFirstDesc: "Perubahan section aktif belum tersimpan.",
  cannotSwitch: "Belum bisa pindah section",
  cannotSwitchDesc: "Gagal menyimpan perubahan. Coba lagi dulu.",
  enhancementApplied: "Enhancement diterapkan",
  contentRestored: "Konten dikembalikan ke versi sebelumnya",
  outlineApproved: "Outline disetujui. Lanjut ke Write.",
  approveOutline: "Setujui outline",
  continueToWrite: "Lanjut ke Write",
  newSection: "Section",
  draft: "Draft",
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
