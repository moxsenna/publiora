export const publishId = {
  title: "Terbitkan ebook Anda",
  summary: "Ringkasan publikasi",
  published: "Sudah terbit",
  openReader: "Buka pembaca",
  manageClaims: "Kelola klaim",
  visibility: "Visibilitas",
  public: "Publik",
  private: "Privat",
  warning: "Peringatan",
  reviewIssues: "Masalah tinjauan",
  otherBlockers: "Penghalang lain",
  reviewProblems: "Tinjau masalah",
  publish: "Terbitkan",
  publishNow: "Terbitkan sekarang",
  republish: "Terbitkan ulang",
  success: "Ebook berhasil diterbitkan",
  failed: "Penerbitan gagal. Periksa kesiapan ebook, lalu coba lagi.",
  claimLinks: "Tautan klaim",
  slug: "Slug URL",
  unlisted: "Tidak terdaftar",
} as const;

const blockerCopy: Record<string, string> = {
  strategy_incomplete: "Strategi belum lengkap.",
  outline_missing: "Outline belum tersedia.",
  outline_not_approved: "Outline belum disetujui.",
  outline_insufficient_sections: "Outline belum memiliki cukup bagian.",
  title_empty: "Judul ebook belum diisi.",
  cta_text_empty: "Teks CTA belum diisi.",
  cta_url_invalid: "URL CTA belum valid.",
  cta_url_missing_or_invalid: "URL CTA belum tersedia atau belum valid.",
};

const checkCopy: Record<string, string> = {
  ...blockerCopy,
  writing_incomplete: "Masih ada bagian yang belum selesai ditulis.",
  missing_author: "Nama penulis belum diisi.",
};

export function getPublishBlockerCopy(code: string): string {
  if (/^(missing|incomplete|failed|empty)_section_/.test(code)) {
    return "Masih ada bagian yang belum siap diterbitkan.";
  }
  return blockerCopy[code] ?? "Persyaratan penerbitan belum lengkap.";
}

export function getPublishCheckCopy(code: string): string {
  if (/^(missing|incomplete|failed|empty)_section_/.test(code)) {
    return "Periksa kembali bagian yang belum siap.";
  }
  return checkCopy[code] ?? "Periksa kembali kesiapan ebook sebelum menerbitkan.";
}
