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
  /**
   * Optional user instruction to guide the planner AI.
   * `angle` is a deprecated alias — prefer `user_instruction`.
   */
  user_instruction?: string;
  /**
   * @deprecated Use `user_instruction` instead.
   */
  angle?: string;
  /**
   * When regenerating an outline that has written ebook_sections, the client
   * must explicitly confirm destructive reset.  Defaults to false.
   *
   * When false and written sections exist, the route returns 409 with code
   * `outline_regenerate_blocked`.
   */
  confirm_reset_written_sections?: boolean;
}

export interface OutlineUpdateInput {
  title?: string;
  description?: string;
  sections?: OutlineSection[];
}
