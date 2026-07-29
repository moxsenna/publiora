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
