// Project entity — single ebook generation lifecycle.

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

export const EBOOK_TYPES: {
  id: EbookType;
  label: string;
  description: string;
}[] = [
  {
    id: "lead_magnet",
    label: "Lead Magnet",
    description: "Gratis untuk capture lead / email list.",
  },
  {
    id: "bonus_product",
    label: "Bonus Product",
    description: "Bonus bundling untuk affiliate / launch.",
  },
  {
    id: "sellable_ebook",
    label: "Sellable Ebook",
    description: "Produk berbayar siap dijual.",
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
  cta_goal?: string | null;
  /** Final CTA display text. */
  final_cta?: string | null;
  /** Destination URL for URL-required CTA goals. */
  cta_url?: string | null;
}

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
}
