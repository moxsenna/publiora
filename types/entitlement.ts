// Reader entitlement — granted access to a published ebook.

export interface Entitlement {
  id: string;
  /** Reader email or anonymous device id. */
  reader_id: string;
  ebook_id: string;
  ebook_title: string;
  ebook_slug: string;
  cover_color: string;
  author: string;
  claim_link_id: string | null;
  created_at: string;
}
