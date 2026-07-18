// Export job — PDF / EPUB rendering from a published ebook.

export type ExportFormat = "pdf" | "epub" | "docx";

export type ExportStatus = "queued" | "processing" | "complete" | "failed";

export interface ExportJob {
  id: string;
  ebook_id: string;
  ebook_title: string;
  format: ExportFormat;
  status: ExportStatus;
  /** Blob/asset url when complete. */
  url: string | null;
  created_at: string;
  completed_at: string | null;
  error: string | null;
}

export interface ExportCreateInput {
  ebook_id: string;
  format: ExportFormat;
}
