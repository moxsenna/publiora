import type { ProjectWorkflowStep, WorkflowCheck } from "@/types/workflow";

export interface ReviewCheckCopy {
  title: string;
  description?: string;
}

const checkCopy: Record<string, ReviewCheckCopy> = {
  strategy_incomplete: { title: "Strategi belum lengkap", description: "Lengkapi bidang wajib pada sesi strategi terlebih dahulu." },
  outline_missing: { title: "Outline belum dibuat", description: "Susun outline bab terlebih dahulu." },
  outline_not_approved: { title: "Outline belum disetujui", description: "Setujui outline sebelum melanjutkan ke penulisan." },
  outline_insufficient_sections: { title: "Outline belum memiliki cukup bagian", description: "Outline membutuhkan minimal 3 bab." },
  title_empty: { title: "Judul ebook belum diisi", description: "Tentukan judul ebook sebelum menerbitkan." },
  publication_title_missing: { title: "Judul ebook belum diisi", description: "Tentukan judul ebook sebelum menerbitkan." },
  subtitle_empty: { title: "Subjudul belum diisi", description: "Subjudul opsional untuk memperjelas topik ebook." },
  no_cta_configured: { title: "CTA belum diatur", description: "Tentukan tujuan dan teks CTA untuk penawaran ebook." },
  cta_goal_missing: { title: "Tujuan CTA belum diisi", description: "Pilih tujuan Call-to-Action yang sesuai." },
  cta_text_empty: { title: "Teks CTA belum diisi", description: "Tuliskan teks ajakan aksi (CTA) yang menarik." },
  cta_url_invalid: { title: "URL CTA belum valid", description: "Pastikan URL tautan CTA menggunakan format yang benar." },
  cta_url_missing_or_invalid: { title: "URL CTA belum tersedia atau belum valid", description: "Tujuan CTA yang dipilih membutuhkan URL tujuan yang valid." },
  promise_missing: { title: "Janji utama belum diisi", description: "Lengkapi janji hasil utama pada strategi." },
  unique_angle_missing: { title: "Sudut unik belum diisi", description: "Lengkapi sudut pandang unik ebook pada strategi." },
  section_count_out_of_range: { title: "Jumlah bagian di luar rentang format", description: "Sesuaikan jumlah bab dengan format ebook." },
  duplicate_outline_titles: { title: "Ada judul bagian outline yang sama", description: "Pastikan setiap bab memiliki judul yang berbeda." },
  key_points_missing: { title: "Poin utama bagian belum lengkap", description: "Lengkapi poin pembahasan untuk tiap bab." },
  markdown_document_in_html: { title: "Isi bagian masih menggunakan format Markdown", description: "Ubah format teks ke format HTML standar editor." },
  repeated_opening: { title: "Pembukaan bagian terlalu mirip", description: "Variasikan kalimat pembuka bab agar transisi lebih alami." },
  bonus_missing_parent_offer: { title: "Bonus belum terhubung ke produk utama", description: "Hubungkan bonus ebook dengan produk induk yang relevan." },
  offer_snapshot_stale: { title: "Data produk memiliki versi yang lebih baru", description: "Data produk telah diperbarui dari versi awal." },

  // Content quality issues
  under_target_words: {
    title: "Panjang kata di bawah target",
    description: "Tambahkan langkah praktis, contoh konkret, atau penjelasan mendalam.",
  },
  over_target_words: {
    title: "Panjang kata melebihi target",
    description: "Pertimbangkan memangkas kalimat yang bertele-tele agar tetap fokus.",
  },
  slightly_under_target: {
    title: "Panjang kata sedikit di bawah target",
    description: "Tambahkan contoh singkat untuk memperkuat penjelasan.",
  },
  slightly_over_target: {
    title: "Panjang kata sedikit di atas target",
    description: "Panjang kata sedikit melebihi target, namun masih dalam batas wajar.",
  },
  extremely_short: {
    title: "Bagian terlalu pendek",
    description: "Perluas isi bagian agar pembahasan materi lebih bernilai bagi pembaca.",
  },
  extremely_long: {
    title: "Bagian terlalu panjang",
    description: "Ringkas bab agar tidak membuat pembaca lelah.",
  },
  empty_content: {
    title: "Bagian belum memiliki isi",
    description: "Tulis atau generate konten bagian ini terlebih dahulu.",
  },
  probable_missing_key_point: {
    title: "Poin utama belum dibahas lengkap",
    description: "Pastikan semua poin rencana bab dibahas pada bagian ini.",
  },
  opening_too_similar_to_previous: {
    title: "Pembukaan terlalu mirip bagian sebelumnya",
    description: "Gunakan variasi kalimat pembuka agar alur membaca lebih segar.",
  },
  opening_similar_to_previous: {
    title: "Pembukaan mirip bagian sebelumnya",
    description: "Variasikan kalimat pembuka bab agar ritme membaca lebih variatif.",
  },
  low_heading_count: {
    title: "Struktur sub-judul masih minim",
    description: "Bagi teks panjang dengan sub-judul (H2/H3) agar mudah dipindai pembaca.",
  },
  format_structure_weak: {
    title: "Struktur format belum optimal",
    description: "Sesuaikan tata letak bab dengan panduan format yang dipilih.",
  },
  cta_in_non_final_section: {
    title: "Ada ajakan CTA sebelum bab penutup",
    description: "Simpan ajakan penawaran di bab akhir agar pembaca fokus pada materi.",
  },
  offer_mentioned_too_often: {
    title: "Penyebutan produk terlalu sering",
    description: "Kurangi penyebutan produk penawaran agar ebook tetap bernilai edukasi tinggi.",
  },
  suspicious_unsupported_claim: {
    title: "Ada klaim data atau angka tanpa konteks",
    description: "Pastikan klaim statistik atau fakta didukung penjelasan yang logis.",
  },
  missing_format_requirement: {
    title: "Elemen wajib template belum terpenuhi",
    description: "Lengkapi elemen khas template seperti daftar periksa atau rangkuman aksi.",
  },
  unsafe_or_removed_content: {
    title: "Format konten tidak didukung editor",
    description: "Gunakan format HTML standar seperti paragraf, judul, dan daftar poin.",
  },
};

const patternedCheckCopy: Array<[RegExp, ReviewCheckCopy]> = [
  [/^missing_section_/, { title: "Ada bagian yang belum dibuat", description: "Buat atau tulis bagian ini di tahap penulisan." }],
  [/^failed_section_/, { title: "Pembuatan bagian gagal", description: "Generate ulang bagian ini di tahap penulisan." }],
  [/^incomplete_section_/, { title: "Ada bagian yang belum selesai", description: "Selesaikan draf bagian ini sebelum menerbitkan." }],
  [/^empty_section_/, { title: "Ada bagian yang belum memiliki isi", description: "Isi konten bab terlebih dahulu." }],
  [/^duplicate_title_/, { title: "Ada judul bagian yang sama", description: "Beri judul yang berbeda untuk tiap bab." }],
  [/^short_section_/, { title: "Ada bagian yang terlalu pendek", description: "Perluas isi materi agar lebih lengkap." }],
  [/^key_points_missing_/, { title: "Poin utama bagian belum lengkap", description: "Lengkapi poin pembahasan bab." }],
  [/^markdown_/, { title: "Isi bagian masih menggunakan format Markdown", description: "Ubah ke format teks dan paragraf standar editor." }],
  [/^opening_sim_/, { title: "Pembukaan bagian terlalu mirip", description: "Variasikan awal bab agar ritme membaca lebih segar." }],
  [/^under_target_words_/, { title: "Panjang kata di bawah target", description: "Tambahkan pembahasan, contoh konkret, atau langkah aksi." }],
  [/^over_target_words_/, { title: "Panjang kata melebihi target", description: "Pertimbangkan merapikan bagian yang bertele-tele." }],
  [/^slightly_under_target_/, { title: "Panjang kata sedikit di bawah target", description: "Tambahkan contoh singkat untuk memperkuat penjelasan." }],
  [/^slightly_over_target_/, { title: "Panjang kata sedikit di atas target", description: "Panjang kata sedikit melebihi target, namun masih wajar." }],
  [/^extremely_short_/, { title: "Bagian terlalu pendek", description: "Perluas isi materi agar bernilai substantif bagi pembaca." }],
  [/^extremely_long_/, { title: "Bagian terlalu panjang", description: "Ringkas bab ini agar tetap fokus pada ide utama." }],
  [/^empty_content_/, { title: "Bagian belum memiliki isi", description: "Tulis atau generate konten untuk bab ini." }],
  [/^probable_missing_key_point_/, { title: "Poin utama belum dibahas lengkap", description: "Pastikan semua poin rencana bab terbahas dengan baik." }],
  [/^opening_too_similar_/, { title: "Pembukaan terlalu mirip bagian sebelumnya", description: "Gunakan variasi kalimat pembuka agar transisi lebih alami." }],
  [/^low_heading_count_/, { title: "Struktur sub-judul masih minim", description: "Tambahkan sub-judul (H2/H3) agar teks mudah dipindai pembaca." }],
  [/^format_structure_weak_/, { title: "Struktur format belum optimal", description: "Sesuaikan susunan bab dengan panduan format template." }],
  [/^cta_in_non_final_/, { title: "Ajakan CTA sebelum bab penutup", description: "Pindahkan tautan penawaran ke bab akhir ebook." }],
  [/^offer_mentioned_too_often_/, { title: "Penyebutan produk terlalu sering", description: "Kurangi frekuensi penyebutan produk penawaran." }],
  [/^suspicious_unsupported_/, { title: "Klaim angka/fakta perlu diperiksa", description: "Pastikan klaim atau data didukung penjelasan yang wajar." }],
  [/^missing_format_requirement_/, { title: "Elemen wajib template belum terpenuhi", description: "Lengkapi elemen khas template seperti daftar periksa atau rangkuman." }],
  [/^unsafe_or_removed_content_/, { title: "Format konten tidak didukung editor", description: "Gunakan format HTML standar yang didukung editor." }],
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

export function getBlockerMessage(blocker: { code: string; message: string }): string {
  const code = blocker.code;
  if (code === "cta_text_empty") return "Isi teks CTA sebelum menerbitkan.";
  if (code === "cta_url_invalid") return "URL tujuan CTA tidak valid.";
  if (code === "cta_url_missing_or_invalid") return "URL tujuan CTA wajib diisi dengan valid.";
  if (code === "title_empty") return "Isi judul ebook terlebih dahulu.";
  if (code === "subtitle_empty") return "Isi subjudul ebook.";
  if (code === "strategy_incomplete") return "Selesaikan strategi terlebih dahulu.";
  if (code === "outline_missing") return "Buat outline terlebih dahulu.";
  if (code === "outline_not_approved") return "Setujui outline terlebih dahulu.";
  if (code === "outline_insufficient_sections") return "Outline butuh minimal 3 bagian.";
  if (code.startsWith("empty_section_")) return "Semua bagian harus memiliki isi.";
  if (code.startsWith("missing_section_")) return "Ada bagian yang belum ditulis.";
  if (code.startsWith("failed_section_")) return "Pembuatan bagian gagal, silakan coba lagi.";
  if (code === "review_blockers_present") return "Selesaikan kendala tinjauan sebelum terbit.";
  if (code === "export_not_ready") return "Format ekspor belum siap diterbitkan.";
  return blocker.message;
}

