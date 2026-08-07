import type { PlanId } from "./billing";

export type Plan = PlanId;

/** Where a user first entered the product. Final — never overwritten once set. */
export type SignupOrigin =
  | "unattributed"
  | "landing_page"
  | "claim_link"
  | "direct_app"
  | "legacy_unknown"
  | "admin_created";

export type InitialIntent = "reader" | "creator";

export type MarketingConsentSource =
  | "landing_signup"
  | "claim_signup"
  | "account_settings"
  | "admin_import";

export interface Profile {
  id: string;
  name: string | null;
  email: string | null;
  avatar_url: string | null;
  role: "user" | "admin";
  plan: PlanId;
  created_at: string;
  updated_at: string;
  /** Acquisition origin. Immutable once finalized — DB default 'unattributed'. */
  signup_origin: SignupOrigin;
  initial_intent: InitialIntent | null;
  first_claim_link_id: string | null;
  first_claim_ebook_id: string | null;
  first_claim_creator_id: string | null;
  /** Lifecycle activation timestamps (one-shot, earliest evidence). */
  reader_activated_at: string | null;
  creator_activated_at: string | null;
  creator_subscribed_at: string | null;
  marketing_email_consent: boolean;
  marketing_email_consent_at: string | null;
  marketing_email_consent_source: MarketingConsentSource | null;
}
