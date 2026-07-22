// Ebook section — a single generated chapter/section.

export interface Section {
  id: string;
  project_id: string;
  outline_section_id: string;
  position: number;
  title: string;
  /** Generated body content as HTML. */
  content_html: string;
  /** Plain text length for analytics. */
  word_count: number;
  status: "pending" | "generating" | "generated" | "failed" | "edited";
  /** Writer/quality metadata (optional until migration applied). */
  generation_meta?: Record<string, unknown>;
  updated_at: string;
}

export interface SectionUpdateInput {
  title?: string;
  content_html?: string;
  /** Optimistic concurrency token (section.updated_at). */
  expected_updated_at?: string;
}
