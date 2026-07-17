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
}

export interface ProjectInput {
  title: string;
  author: string;
  subtitle?: string;
  description: string;
  audience: string;
  tone: string;
  niche: string;
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
  cover_color?: string;
}
