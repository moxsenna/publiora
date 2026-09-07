// Internal audience segmentation types (service-role only).
//
// Mirrors public.internal_user_audience_v1 — see
// supabase/migrations/20260807000004_internal_user_audience_v1.sql and the
// implementation plan §19. Normal client code never reads this view; it is
// consumed by server-only exports/jobs using the service role.

import type { SignupOrigin } from "./auth";

/** Canonical internal segments (§19.2) — one per user, derived from
 * attribution + lifecycle state, in priority order. Do not extend with ad
 * hoc personas. */
export type InternalAudienceSegment =
  | "landing_creator_prospect"
  | "landing_creator_active"
  | "claim_reader_only"
  | "claim_reader_became_creator"
  | "claim_reader_became_paid_creator"
  | "direct_creator"
  | "legacy_unclassified";

/** One row of public.internal_user_audience_v1. */
export interface InternalUserAudienceRow {
  user_id: string;
  email: string | null;
  name: string | null;
  signup_origin: SignupOrigin;
  initial_intent: "reader" | "creator" | null;
  first_claim_link_id: string | null;
  first_claim_ebook_id: string | null;
  first_claim_creator_id: string | null;
  first_claim_label: string | null;
  first_claim_ebook_title: string | null;
  reader_activated_at: string | null;
  creator_activated_at: string | null;
  creator_subscribed_at: string | null;
  entitlement_count: number;
  project_count: number;
  publication_count: number;
  current_plan_id: string;
  current_subscription_status: string;
  marketing_email_consent: boolean;
  marketing_email_consent_at: string | null;
  created_at: string;
  last_known_activity_at: string | null;
  derived_segment: InternalAudienceSegment;
}