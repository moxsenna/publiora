// Load accepted project–offer snapshot context for agents and workspace.

import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  ProjectOfferContext,
  ProjectOfferRelationship,
  OfferContextSnapshot,
} from "@/types/offer";
import { sourceIsNewer } from "@/lib/offers/snapshot";
import { mapOfferRow, mapProjectOfferLinkRow } from "@/lib/offers/map-row";

export async function loadPrimaryProjectOfferContext(params: {
  supabase: SupabaseClient;
  projectId: string;
  ownerId: string;
}): Promise<ProjectOfferContext | null> {
  const { supabase, projectId, ownerId } = params;

  // Ensure project ownership first
  const { data: project, error: pErr } = await supabase
    .from("projects")
    .select("id, owner_id")
    .eq("id", projectId)
    .eq("owner_id", ownerId)
    .maybeSingle();

  if (pErr || !project) {
    return null;
  }

  const { data: linkRow, error: linkErr } = await supabase
    .from("project_offer_links")
    .select("*")
    .eq("project_id", projectId)
    .eq("is_primary", true)
    .maybeSingle();

  if (linkErr || !linkRow) {
    return null;
  }

  const link = mapProjectOfferLinkRow(linkRow as Record<string, unknown>);

  const { data: offerRow, error: oErr } = await supabase
    .from("offers")
    .select("id, owner_id, updated_at")
    .eq("id", link.offer_id)
    .eq("owner_id", ownerId)
    .maybeSingle();

  if (oErr || !offerRow) {
    // Link exists but offer not readable — treat as no context
    return null;
  }

  const offer = mapOfferRow({
    ...(offerRow as Record<string, unknown>),
    name: "",
    offer_type: "other",
    ownership: "owned",
    status: "active",
    short_description: null,
    target_audience: null,
    primary_problem: null,
    primary_outcome: null,
    niche: null,
    destination_url: null,
    created_at: offerRow.updated_at,
  });

  return {
    link_id: link.id,
    relationship: link.relationship as ProjectOfferRelationship,
    snapshot: link.context_snapshot as OfferContextSnapshot,
    source_is_newer: sourceIsNewer(
      offer.updated_at,
      link.source_offer_updated_at,
    ),
  };
}

export async function loadProjectOfferLinks(params: {
  supabase: SupabaseClient;
  projectId: string;
  ownerId: string;
}) {
  const { supabase, projectId, ownerId } = params;

  const { data: project } = await supabase
    .from("projects")
    .select("id")
    .eq("id", projectId)
    .eq("owner_id", ownerId)
    .maybeSingle();

  if (!project) return [];

  const { data: links, error } = await supabase
    .from("project_offer_links")
    .select("*")
    .eq("project_id", projectId)
    .order("is_primary", { ascending: false });

  if (error || !links) return [];

  return links.map((row) => mapProjectOfferLinkRow(row as Record<string, unknown>));
}
