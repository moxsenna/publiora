// ---------------------------------------------------------------------------
// Centralized Indonesian copy for the Strategy workflow stage.
// ---------------------------------------------------------------------------

/** Core UI strings used across StrategyPanel, StrategyBriefCard,
 *  StrategyReadinessCard, and StrategyFieldEditor. */
export const STRATEGY_COPY_ID = {
  assistantName: "Asisten Strategi",
  assistantDescription: "Susun fondasi ebook sebelum membuat struktur.",
  emptyTitle: "Mulai susun strategi ebook",
  emptyDescription:
    "Ceritakan ide awal Anda. Asisten akan membantu melengkapi target pembaca, masalah, hasil, janji, dan sudut unik.",
  composerPlaceholder: "Ketik angka pilihan atau tulis bebas…",
  composerHelper:
    "Ketik 1–4 untuk pilih opsi \u00b7 atau tulis bebas \u00b7 Enter kirim \u00b7 Shift+Enter baris baru",
  sendAriaLabel: "Kirim pesan",
  sendError: "Pesan gagal dikirim.",
  sending: "Mengirim pesan…",
  retrySend: "Kirim ulang",
  sendingInline: "Mengirim…",
  briefTitle: "Brief Ebook",
  briefProgress: (filled: number, total: number) =>
    `${filled} dari ${total} informasi inti lengkap`,
  editBrief: "Edit brief",
  saveBrief: "Simpan perubahan",
  saveSuccess: "Brief berhasil diperbarui.",
  saveError: "Brief gagal disimpan.",
  readinessTitle: "Kesiapan Strategi",
  readinessDescription: "Seberapa siap brief ini digunakan untuk membuat struktur.",
  missingSectionTitle: "Yang masih kurang",
  allComplete: "Semua informasi inti sudah lengkap.",
  advancedContext: "Konteks tambahan",
  createOutline: "Buat struktur ebook",
  openOutline: "Buka struktur ebook",
  emptyRequiredBadge: "Wajib",
  emptyOptionalBadge: "Opsional",
  emptyValue: "Belum diisi",
  footerIncomplete: (remaining: number) =>
    `Lengkapi ${remaining} informasi inti lagi.`,

  // Editor modal
  editorTitle: "Edit Informasi Strategi",
  editorDescription:
    "Lengkapi detail yang menentukan strategi ebook Anda.",
  editorSave: "Simpan perubahan",
  editorCancel: "Batal",
  editorSaveSuccess: "Informasi strategi berhasil disimpan.",
  editorSaveError: "Gagal menyimpan informasi strategi.",
  editorArrayPlaceholder: "Satu item per baris",

  // Strategy unavailable state
  strategyUnavailable:
    "Data strategi belum tersedia. Muat ulang halaman atau coba kirim pesan lagi.",
  reload: "Muat ulang",

  // Missing field CTA
  missingFieldsCta: (count: number) =>
    `${count} informasi inti masih diperlukan. Lanjutkan obrolan atau `,

  // Mobile nav text
  mobileStepOf: (current: number, total: number) =>
    `Tahap ${current} dari ${total}`,
  mobileActive: "aktif",

  // Compact brief trigger (tablet + mobile, <lg)
  viewBrief: "Lihat brief",
  briefCompactSummary: (filled: number, total: number, score: number) =>
    `Lihat brief \u00b7 ${filled}/${total} \u00b7 Kesiapan ${score}%`,
} as const;

// ---------------------------------------------------------------------------
// Starter reply chips (S03 will wire contextual behaviour; here we provide
// the copy for use when no missing-field prompts apply.)
// ---------------------------------------------------------------------------

export const STRATEGY_STARTER_REPLIES_ID = [
  {
    label: "Cari topik ebook",
    message: "Bantu saya menemukan topik ebook yang paling potensial.",
  },
  {
    label: "Saya sudah punya topik",
    message: "Saya sudah punya topik ebook dan ingin menyusun strateginya.",
  },
  {
    label: "Ebook untuk leads",
    message: "Saya ingin membuat ebook untuk mendapatkan leads.",
  },
];

// ---------------------------------------------------------------------------
// Field labels — used in StrategyFieldEditor and StrategyBriefCard display.
// Core fields (6): topic, audience, primary_problem, desired_outcome, core_promise, unique_angle
// Advanced fields (7): audience_sophistication, pain_points, content_pillars, product_or_offer, funnel_goal, cta_goal, tone
// ---------------------------------------------------------------------------

import type { EbookStrategy } from "@/types/strategy";
// EbookType imported near type-aware helpers below

/** Full editor labels (plan §5.9 table). */
export const STRATEGY_FIELD_LABELS: Record<keyof EbookStrategy, string> = {
  topic: "Topik ebook",
  audience: "Target pembaca",
  audience_sophistication: "Tingkat pemahaman audiens",
  primary_problem: "Masalah utama",
  pain_points: "Titik masalah pembaca",
  desired_outcome: "Hasil yang diinginkan",
  core_promise: "Janji utama ebook",
  unique_angle: "Sudut unik",
  content_pillars: "Pilar konten",
  product_or_offer: "Produk atau penawaran",
  funnel_goal: "Tujuan funnel",
  cta_goal: "Tujuan CTA",
  tone: "Gaya bahasa",
  traffic_source: "Sumber traffic",
  bonus_role: "Fungsi bonus",
  usage_moment: "Waktu penggunaan bonus",
  sales_positioning: "Posisi produk",
  buyer_objections: "Keberatan pembeli",
};

/** Short display labels used in the brief card list (16-char budget). */
export const STRATEGY_BRIEF_FIELD_LABELS: Record<keyof EbookStrategy, string> = {
  topic: "Topik",
  audience: "Target pembaca",
  audience_sophistication: "Tingkat pemahaman",
  primary_problem: "Masalah utama",
  pain_points: "Titik masalah",
  desired_outcome: "Hasil yang diinginkan",
  core_promise: "Janji utama",
  unique_angle: "Sudut unik",
  content_pillars: "Pilar konten",
  product_or_offer: "Produk/penawaran",
  funnel_goal: "Tujuan funnel",
  cta_goal: "Tujuan CTA",
  tone: "Gaya bahasa",
  traffic_source: "Sumber traffic",
  bonus_role: "Fungsi bonus",
  usage_moment: "Waktu penggunaan",
  sales_positioning: "Posisi produk",
  buyer_objections: "Keberatan pembeli",
};

import type { EbookType } from "@/types/project";

/** Type-aware field label overrides for brief/editor. */
export function strategyFieldLabel(
  key: keyof EbookStrategy,
  ebookType?: EbookType | null,
): string {
  if (key === "product_or_offer") {
    if (ebookType === "lead_magnet") return "Produk/layanan lanjutan";
    if (ebookType === "bonus_product") return "Produk utama";
    if (ebookType === "sellable_ebook") return "Offer atau bundle terkait";
  }
  if (key === "funnel_goal") {
    if (ebookType === "lead_magnet") return "Tujuan lead magnet";
    if (ebookType === "sellable_ebook") return "Tujuan penjualan";
  }
  return STRATEGY_FIELD_LABELS[key];
}

export function strategyBriefFieldLabel(
  key: keyof EbookStrategy,
  ebookType?: EbookType | null,
): string {
  if (key === "product_or_offer") {
    if (ebookType === "lead_magnet") return "Offer lanjutan";
    if (ebookType === "bonus_product") return "Produk utama";
    if (ebookType === "sellable_ebook") return "Offer terkait";
  }
  if (key === "funnel_goal") {
    if (ebookType === "lead_magnet") return "Tujuan lead";
    if (ebookType === "sellable_ebook") return "Tujuan jual";
  }
  return STRATEGY_BRIEF_FIELD_LABELS[key];
}

// ---------------------------------------------------------------------------
// Missing-field prompt suggestions — shown when the assistant identifies
// gaps. These are static UI copy (not user data), so they must be in ID.
// ---------------------------------------------------------------------------

export const STRATEGY_MISSING_FIELD_PROMPTS: Record<string, string> = {
  topic: "Saya butuh bantuan menentukan topik ebook",
  audience: "Siapa yang sebaiknya menjadi target pembaca?",
  primary_problem: "Bantu saya mengidentifikasi masalah utama",
  desired_outcome: "Hasil apa yang sebaiknya dicapai pembaca?",
  core_promise: "Bantu saya merumuskan janji utama",
  unique_angle: "Sudut unik apa yang bisa saya angkat?",
  pain_points: "Titik masalah apa yang perlu saya bahas?",
  content_pillars: "Sarankan pilar konten untuk ebook saya",
  product_or_offer: "Bagaimana memposisikan produk/penawaran?",
  funnel_goal: "Tujuan funnel apa yang paling cocok?",
  cta_goal: "Bantu saya menentukan tujuan CTA",
  tone: "Gaya bahasa apa yang cocok untuk ebook ini?",
  traffic_source: "Dari mana traffic lead magnet ini datang?",
  bonus_role: "Apa fungsi utama bonus ini?",
  usage_moment: "Kapan bonus ini sebaiknya digunakan?",
  sales_positioning: "Di mana posisi ebook ini dalam penawaran saya?",
  buyer_objections: "Keberatan apa yang sering muncul dari pembeli?",
  audience_sophistication:
    "Tingkat pemahaman seperti apa yang sesuai dengan audiens?",
};

// ---------------------------------------------------------------------------
// Default suggestion chips (shown when no missing fields detected).
// ---------------------------------------------------------------------------

export const STRATEGY_DEFAULT_SUGGESTIONS = [
  "Bantu saya menentukan masalah utama ebook",
  "Apa janji utama yang cocok untuk audiens ini?",
  "Sarankan pilar konten berdasarkan topik saya",
  "Sudut unik apa yang bisa saya gunakan?",
  "Bantu saya menentukan titik masalah dan hasil yang diinginkan",
];

// ---------------------------------------------------------------------------
// Readiness labels (plan §5.8).
// ---------------------------------------------------------------------------

/** Score range to Indonesian label. */
export function readinessScoreLabel(score: number): string {
  if (score >= 90) return "Sangat siap";
  if (score >= 70) return "Siap membuat struktur";
  if (score >= 40) return "Perlu dilengkapi";
  return "Baru dimulai";
}

/** Readiness next-action labels (plan §5.8). */
export const STRATEGY_NEXT_ACTION_LABELS: Record<string, string> = {
  continue_strategy: "Lanjutkan menyusun strategi",
  create_outline: "Buat struktur ebook",
  review_outline: "Tinjau struktur",
  start_writing: "Mulai menulis bagian",
};

/** Missing-field short labels (not full questions). */
export const STRATEGY_MISSING_FIELD_SHORT_LABELS: Record<string, string> = {
  topic: "Topik ebook",
  audience: "Target pembaca",
  audience_sophistication: "Tingkat pemahaman audiens",
  primary_problem: "Masalah utama",
  pain_points: "Titik masalah pembaca",
  desired_outcome: "Hasil yang diinginkan",
  core_promise: "Janji utama",
  unique_angle: "Sudut unik",
  content_pillars: "Pilar konten",
  product_or_offer: "Produk/penawaran",
  funnel_goal: "Tujuan funnel",
  cta_goal: "Tujuan CTA",
  tone: "Gaya bahasa",
};
