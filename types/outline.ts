// Outline — table of contents blueprint for an ebook.

export interface OutlineSection {
  id: string;
  /** Position in the list, starts at 1. */
  position: number;
  title: string;
  /** Short description of what the section covers. */
  summary: string;
  /** Key talking points / bullet seeds. */
  key_points: string[];
  /** Estimated word count for the section. */
  estimated_words: number;
  /** Generation status per section. */
  status: "pending" | "generating" | "generated" | "failed";
}

export interface Outline {
  id: string;
  project_id: string;
  title: string;
  description: string;
  sections: OutlineSection[];
  approved: boolean;
  approved_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface OutlineGenerateInput {
  /** Optional alternative angle to nudge the strategist agent. */
  angle?: string;
}

export interface OutlineUpdateInput {
  title?: string;
  description?: string;
  sections?: OutlineSection[];
}
