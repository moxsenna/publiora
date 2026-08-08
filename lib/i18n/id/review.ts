import type { ProjectWorkflowStep, WorkflowCheck } from "@/types/workflow";

export interface ReviewCheckCopy {
  title: string;
  description?: string;
}

const checkCopy: Record<string, ReviewCheckCopy> = {
  strategy_incomplete: { title: "Strategi belum lengkap" },
  outline_missing: { title: "Outline belum dibuat" },
  outline_not_approved: { title: "Outline belum disetujui" },
  outline_insufficient_sections: { title: "Outline belum memiliki cukup bagian" },
  title_empty: { title: "Judul ebook belum diisi" },
  publication_title_missing: { title: "Judul ebook belum diisi" },
  subtitle_empty: { title: "Subjudul belum diisi" },
  no_cta_configured: { title: "CTA belum diatur" },
  cta_goal_missing: { title: "Tujuan CTA belum diisi" },
  cta_text_empty: { title: "Teks CTA belum diisi" },
  cta_url_invalid: { title: "URL CTA belum valid" },
  cta_url_missing_or_invalid: { title: "URL CTA belum tersedia atau belum valid" },
  promise_missing: { title: "Janji utama belum diisi" },
  unique_angle_missing: { title: "Sudut unik belum diisi" },
  section_count_out_of_range: { title: "Jumlah bagian di luar rentang format" },
  duplicate_outline_titles: { title: "Ada judul bagian outline yang sama" },
  key_points_missing: { title: "Poin utama bagian belum lengkap" },
  markdown_document_in_html: { title: "Isi bagian masih menggunakan format Markdown" },
  repeated_opening: { title: "Pembukaan bagian terlalu mirip" },
  bonus_missing_parent_offer: { title: "Bonus belum terhubung ke produk utama" },
  offer_snapshot_stale: { title: "Data produk memiliki versi yang lebih baru" },
};

const patternedCheckCopy: Array<[RegExp, ReviewCheckCopy]> = [
  [/^missing_section_/, { title: "Ada bagian yang belum dibuat" }],
  [/^failed_section_/, { title: "Pembuatan bagian gagal" }],
  [/^incomplete_section_/, { title: "Ada bagian yang belum selesai" }],
  [/^empty_section_/, { title: "Ada bagian yang belum memiliki isi" }],
  [/^duplicate_title_/, { title: "Ada judul bagian yang sama" }],
  [/^short_section_/, { title: "Ada bagian yang terlalu pendek" }],
  [/^key_points_missing_/, { title: "Poin utama bagian belum lengkap" }],
  [/^markdown_/, { title: "Isi bagian masih menggunakan format Markdown" }],
  [/^opening_sim_/, { title: "Pembukaan bagian terlalu mirip" }],
];

const safeFallback: ReviewCheckCopy = {
  title: "Pemeriksaan ini perlu ditinjau",
  description: "Buka tahap terkait untuk memeriksa dan memperbaikinya.",
};

export function getReviewCheckCopy(
  check: Pick<WorkflowCheck, "id"> & Partial<WorkflowCheck>,
): ReviewCheckCopy {
  const keys = [check.code, check.id].filter((key): key is string => !!key);
  for (const key of keys) {
    const exact = checkCopy[key];
    if (exact) return exact;
    const patterned = patternedCheckCopy.find(([pattern]) => pattern.test(key));
    if (patterned) return patterned[1];
  }
  return safeFallback;
}

const stepActionCopy: Record<ProjectWorkflowStep, string> = {
  strategy: "Buka Strategi",
  outline: "Buka Outline",
  write: "Buka Penulisan",
  review: "Buka Review",
  publish: "Buka Penerbitan",
};

export function getReviewStepActionCopy(step: ProjectWorkflowStep): string {
  return stepActionCopy[step];
}

export const reviewId = {
  title: "Review kualitas",
  strategy: "Strategi",
  structure: "Struktur",
  content: "Kualitas Isi",
  offerCta: "Produk & CTA",
  ready: "Siap Terbit",
  openSection: "Buka bagian",
  fix: "Perbaiki",
  freeChecks: "Pemeriksaan otomatis (gratis)",
  aiReview: (cost: number) => `Periksa kualitas dengan AI · ${cost} kredit`,
  noIssues: "Tidak ada masalah penghalang. Siap ditinjau untuk terbit.",
  warningsOnly: "Ada peringatan — tidak wajib diperbaiki sebelum terbit.",
  blockers: "Ada penghalang — perbaiki dulu sebelum terbit.",
} as const;
