// Project entity — single ebook generation lifecycle.

import type { CtaGoal } from "@/types/ai-suggestions";

export type ProjectStatus =
  | "draft" // created, outline not generated yet
  | "outline_draft" // outline generated, awaiting approval
  | "approved" // outline approved, ready to generate
  | "generating" // sections being generated
  | "generated" // all sections generated, ready to review
  | "publishing" // publish flow in progress
  | "published" // published as ebook
  | "failed"; // generation failed

export type EbookType = "lead_magnet" | "bonus_product" | "sellable_ebook";

export type LeadGoal =
  | "collect_email"
  | "join_whatsapp"
  | "webinar_registration"
  | "book_call"
  | "start_trial"
  | "visit_offer"
  | "other";

export type BonusRole =
  | "implementation_aid"
  | "ready_to_use_assets"
  | "speed_to_result"
  | "objection_handler"
  | "increase_perceived_value"
  | "support_next_step"
  | "other";

export type SalesPositioning =
  | "entry_product"
  | "core_product"
  | "premium_authority"
  | "bundle_component";

export const LEAD_GOALS: LeadGoal[] = [
  "collect_email",
  "join_whatsapp",
  "webinar_registration",
  "book_call",
  "start_trial",
  "visit_offer",
  "other",
];

export const BONUS_ROLES: BonusRole[] = [
  "implementation_aid",
  "ready_to_use_assets",
  "speed_to_result",
  "objection_handler",
  "increase_perceived_value",
  "support_next_step",
  "other",
];

export const SALES_POSITIONINGS: SalesPositioning[] = [
  "entry_product",
  "core_product",
  "premium_authority",
  "bundle_component",
];

/** @deprecated Prefer EBOOK_TYPE_LABELS from lib/projects/project-type-copy */
export const EBOOK_TYPES: {
  id: EbookType;
  label: string;
  description: string;
}[] = [
  {
    id: "lead_magnet",
    label: "Lead Magnet",
    description:
      "Konten gratis untuk menarik calon pelanggan dan mengarahkan mereka ke langkah berikutnya.",
  },
  {
    id: "bonus_product",
    label: "Bonus Pembelian",
    description:
      "Konten pendamping yang menambah nilai dan membantu pembeli mendapatkan hasil dari produk utama.",
  },
  {
    id: "sellable_ebook",
    label: "Ebook Berbayar",
    description:
      "Produk digital mandiri dengan nilai yang cukup kuat untuk dijual.",
  },
];

export interface Project {
  id: string;
  owner_id: string;
  title: string;
  author: string;
  subtitle: string | null;
  description: string;
  audience: string;
  tone: string;
  niche: string;
  /** MVP ebook purpose. */
  ebook_type: EbookType;
  status: ProjectStatus;
  /** Optional system or custom template id. */
  template_id: string | null;
  /** Progress 0–100 for generating state. */
  progress: number;
  /** Count of sections generated so far. */
  sections_generated: number;
  total_sections: number;
  created_at: string;
  updated_at: string;
  /** When the ebook was published. */
  published_at: string | null;
  cover_color: string;
  /** Selected CTA goal type (MVP — set during strategy/review). */
  cta_goal: CtaGoal | null;
  /** Final CTA display text. */
  final_cta: string | null;
  /** Destination URL for URL-required CTA goals. */
  cta_url: string | null;
}

/** Legacy flat create payload (compatibility window). */
export interface ProjectInput {
  title: string;
  author: string;
  subtitle?: string;
  description: string;
  audience: string;
  tone: string;
  niche: string;
  ebook_type?: EbookType;
  template_id?: string;
}

export interface ProjectUpdate {
  title?: string;
  author?: string;
  subtitle?: string;
  description?: string;
  audience?: string;
  tone?: string;
  niche?: string;
  ebook_type?: EbookType;
  cover_color?: string;
  cta_goal?: CtaGoal | null;
  final_cta?: string | null;
  cta_url?: string | null;
}
