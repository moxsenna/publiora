// Published ebook — a project that has been turned into a reader-facing artifact.

import type { CtaGoal } from "@/types/ai-suggestions";
import type { OfferContextSnapshot, ProjectOfferRelationship } from "@/types/offer";

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
  /** Snapshot of CTA settings from the source project. */
  cta_goal: CtaGoal | null;
  /** Final CTA display text. */
  final_cta: string | null;
  /** Destination URL for URL-required CTA goals. */
  cta_url: string | null;
  /** Immutable offer context at publish time (reader must not query live offers). */
  offer_context?: {
    relationship: ProjectOfferRelationship;
    snapshot: OfferContextSnapshot;
  } | null;
}

export interface PublishInput {
  project_id: string;
  is_public?: boolean;
}
