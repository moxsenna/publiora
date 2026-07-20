// Indonesian labels and descriptions for type-aware project creation.

import type { EbookType } from "@/types/project";
import type {
  BonusRole,
  LeadGoal,
  SalesPositioning,
} from "@/types/project";
import type { CtaGoal } from "@/types/ai-suggestions";
import type { TemplateFormat } from "@/types/template";

export const EBOOK_TYPE_LABELS: Record<EbookType, string> = {
  lead_magnet: "Lead Magnet",
  bonus_product: "Bonus Pembelian",
  sellable_ebook: "Ebook Berbayar",
};

export const EBOOK_TYPE_DESCRIPTIONS: Record<EbookType, string> = {
  lead_magnet:
    "Konten gratis untuk menarik calon pelanggan dan mengarahkan mereka ke langkah berikutnya.",
  bonus_product:
    "Konten pendamping yang menambah nilai dan membantu pembeli mendapatkan hasil dari produk utama.",
  sellable_ebook:
    "Produk digital mandiri dengan nilai yang cukup kuat untuk dijual.",
};

export const EBOOK_TYPE_USE_CASES: Record<EbookType, string[]> = {
  lead_magnet: [
    "Mengumpulkan email",
    "Mengarahkan ke WhatsApp",
    "Mendaftar webinar atau trial",
  ],
  bonus_product: [
    "Bonus kelas atau course",
    "Bonus affiliate",
    "Panduan implementasi produk",
  ],
  sellable_ebook: [
    "Panduan premium",
    "Playbook mendalam",
    "Framework atau workbook berbayar",
  ],
};

export const LEAD_GOAL_LABELS: Record<LeadGoal, string> = {
  collect_email: "Mengumpulkan email",
  join_whatsapp: "Mengarahkan ke WhatsApp",
  webinar_registration: "Mendaftarkan webinar",
  book_call: "Menjadwalkan konsultasi",
  start_trial: "Memulai trial",
  visit_offer: "Mengunjungi halaman penawaran",
  other: "Tujuan lain",
};

export const BONUS_ROLE_LABELS: Record<BonusRole, string> = {
  implementation_aid: "Membantu implementasi produk utama",
  ready_to_use_assets: "Memberikan aset siap pakai",
  speed_to_result: "Mempercepat hasil pembeli",
  objection_handler: "Menjawab kebingungan atau keberatan",
  increase_perceived_value: "Menambah nilai paket pembelian",
  support_next_step: "Membantu langkah lanjutan",
  other: "Fungsi lainnya",
};

export const SALES_POSITIONING_LABELS: Record<SalesPositioning, string> = {
  entry_product: "Produk entry-level",
  core_product: "Produk utama",
  premium_authority: "Produk premium / authority",
  bundle_component: "Bagian dari bundle",
};

export const CTA_GOAL_LABELS_ID: Record<CtaGoal, string> = {
  visit_product: "Kunjungi halaman produk",
  join_whatsapp: "Gabung WhatsApp",
  claim_bonus: "Klaim bonus / unduhan",
  buy_product: "Beli produk",
  follow_creator: "Ikuti kreator",
  custom: "CTA kustom",
};

export const TRAFFIC_SOURCE_OPTIONS = [
  "Konten organik",
  "Iklan berbayar",
  "Media sosial",
  "Komunitas",
  "Affiliate / partner",
  "Website / SEO",
  "Belum ditentukan",
] as const;

export const USAGE_MOMENT_OPTIONS = [
  "Sebelum mulai produk utama",
  "Saat mengikuti produk utama",
  "Setelah modul atau bagian tertentu",
  "Setelah menyelesaikan produk utama",
  "Saat pembeli mengalami hambatan",
  "Bebas digunakan kapan saja",
] as const;

export const TEMPLATE_FORMAT_LABELS: Record<TemplateFormat, string> = {
  blank: "Blank",
  quick_win_guide: "Quick Win Guide",
  playbook: "Playbook",
  checklist: "Checklist",
  framework: "Framework",
  workbook: "Workbook",
  implementation_guide: "Panduan Implementasi",
  resource_guide: "Resource Guide",
  workshop: "Workshop",
};

export const DEPTH_LABELS = {
  quick: "Cepat",
  standard: "Standar",
  deep: "Mendalam",
} as const;

/** Type-aware label for Strategy product_or_offer. */
export function productOrOfferLabel(ebookType: EbookType): string {
  switch (ebookType) {
    case "lead_magnet":
      return "Produk/layanan lanjutan";
    case "bonus_product":
      return "Produk utama";
    case "sellable_ebook":
      return "Offer atau bundle terkait";
  }
}

/** Type-aware label for Strategy funnel_goal. */
export function funnelGoalLabel(ebookType: EbookType): string | null {
  switch (ebookType) {
    case "lead_magnet":
      return "Tujuan lead magnet";
    case "bonus_product":
      return null;
    case "sellable_ebook":
      return "Tujuan penjualan";
  }
}

export function ebookTypeLabel(type: EbookType): string {
  return EBOOK_TYPE_LABELS[type];
}

export function leadGoalLabel(goal: LeadGoal): string {
  return LEAD_GOAL_LABELS[goal];
}

export function bonusRoleLabel(role: BonusRole): string {
  return BONUS_ROLE_LABELS[role];
}

export function salesPositioningLabel(pos: SalesPositioning): string {
  return SALES_POSITIONING_LABELS[pos];
}

export function ctaGoalLabel(goal: CtaGoal): string {
  return CTA_GOAL_LABELS_ID[goal];
}
