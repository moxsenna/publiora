export type SectionRevisionSource =
  | "before_regenerate"
  | "before_enhancement_accept"
  | "manual_version";

export interface SectionRevision {
  id: string;
  section_id: string;
  project_id: string;
  title: string;
  content_html: string;
  word_count: number;
  source: SectionRevisionSource;
  created_at: string;
}
