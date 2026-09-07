// ReaderDocument — the single rendering contract for the reader.
// Both published ebooks and unpublished project previews adapt into this
// shape; Reader.tsx must never receive raw Supabase rows.

export type ReaderDocumentSource = "project_preview" | "published";

export interface ReaderSectionDocument {
  id: string;
  source_section_id: string | null;
  position: number;
  title: string;
  content_html: string;
  is_complete: boolean;
}

export interface ReaderCtaDocument {
  body: string;
  button_label: string | null;
  url: string | null;
}

export interface ReaderDocumentCapabilities {
  can_track_progress: boolean;
  can_open_library: boolean;
  can_share: boolean;
  can_edit_sections: boolean;
}

export interface ReaderDocument {
  id: string;
  source: ReaderDocumentSource;
  title: string;
  subtitle: string | null;
  author: string;
  cover_color: string;
  sections: ReaderSectionDocument[];
  cta: ReaderCtaDocument | null;
  capabilities: ReaderDocumentCapabilities;
  source_project_id: string | null;
  published_slug: string | null;
}

export type ReaderMode = "creator_preview" | "claimed_reader";

/** Inline placeholder for sections that are not yet complete in a preview. */
export const PREVIEW_INCOMPLETE_PLACEHOLDER =
  "<p style=\"opacity:0.55\">Bagian ini belum selesai. Konten lengkap akan tampil setelah bagian diterbitkan.</p>";
