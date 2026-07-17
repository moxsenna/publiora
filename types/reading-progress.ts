// Reading progress — per reader, per ebook.

export interface ReadingProgress {
  id: string;
  reader_id: string;
  ebook_id: string;
  ebook_title: string;
  cover_color: string;
  author: string;
  /** 0–100 percent scrolled. */
  progress: number;
  /** Active section position. */
  current_section: number;
  total_sections: number;
  last_read_at: string;
}
