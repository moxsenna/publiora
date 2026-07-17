// Claim link — access distribution primitive.

export type ClaimLinkStatus = "active" | "expired" | "revoked";

export interface ClaimLink {
  id: string;
  ebook_id: string;
  /** Public token used in /claim/:token URL. */
  token: string;
  label: string;
  status: ClaimLinkStatus;
  /** Total redemption slots; null = unlimited. */
  max_uses: number | null;
  used_count: number;
  created_at: string;
  expires_at: string | null;
  revoked_at: string | null;
}

export interface ClaimEvent {
  id: string;
  claim_link_id: string;
  /** Reader email or "Guest" if anonymous. */
  reader_email: string;
  status: "claimed" | "already_owned" | "expired" | "revoked" | "limit_reached";
  created_at: string;
}

export interface ClaimCreateInput {
  ebook_id: string;
  label: string;
  max_uses?: number | null;
  expires_in_days?: number;
}
