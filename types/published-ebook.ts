// Published ebook — a project that has been turned into a reader-facing artifact.

export interface PublishedEbook {
  id: string;
  project_id: string;
  slug: string;
  title: string;
  author: string;
  subtitle: string | null;
  cover_color: string;
  /** Aggregated sections for the reader. */
  sections: {
    id: string;
    position: number;
    title: string;
    content_html: string;
  }[];
  published_at: string;
  /** Total reader analytics. */
  total_readers: number;
  active_claims: number;
  is_public: boolean;
}

export interface PublishInput {
  project_id: string;
  is_public?: boolean;
}
