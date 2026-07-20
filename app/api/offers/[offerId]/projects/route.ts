import { createClient } from "@/lib/supabase/server";
import { jsonError } from "@/lib/api/errors";
import { mapOfferRow } from "@/lib/offers/map-row";
import { sourceIsNewer } from "@/lib/offers/snapshot";
import type { OfferLinkedProjectSummary, ProjectOfferRelationship } from "@/types/offer";

type RouteCtx = { params: Promise<{ offerId: string }> };

export async function GET(_req: Request, ctx: RouteCtx) {
  try {
    const { offerId } = await ctx.params;
    const supabase = await createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return jsonError("Unauthorized", 401, "unauthorized");
    }

    const { data: offerRow, error: offerErr } = await supabase
      .from("offers")
      .select("*")
      .eq("id", offerId)
      .eq("owner_id", user.id)
      .maybeSingle();

    if (offerErr) {
      return jsonError(offerErr.message, 500, "db_error");
    }
    if (!offerRow) {
      return jsonError("Offer not found", 404, "not_found");
    }

    const offer = mapOfferRow(offerRow as Record<string, unknown>);

    const { data: links, error: linkErr } = await supabase
      .from("project_offer_links")
      .select("project_id, relationship, is_primary, source_offer_updated_at")
      .eq("offer_id", offerId)
      .order("created_at", { ascending: false });

    if (linkErr) {
      return jsonError(linkErr.message, 500, "db_error");
    }

    const projectIds = (links ?? []).map(
      (l) => (l as { project_id: string }).project_id,
    );
    if (projectIds.length === 0) {
      return Response.json({ items: [] as OfferLinkedProjectSummary[] });
    }

    const { data: projects, error: pErr } = await supabase
      .from("projects")
      .select("id, title, ebook_type, status, updated_at")
      .in("id", projectIds)
      .eq("owner_id", user.id);

    if (pErr) {
      return jsonError(pErr.message, 500, "db_error");
    }

    const projectMap = new Map(
      (projects ?? []).map((p) => {
        const row = p as {
          id: string;
          title: string;
          ebook_type: string;
          status: string;
          updated_at: string;
        };
        return [row.id, row] as const;
      }),
    );

    const items: OfferLinkedProjectSummary[] = (links ?? [])
      .map((link) => {
        const l = link as {
          project_id: string;
          relationship: ProjectOfferRelationship;
          is_primary: boolean;
          source_offer_updated_at: string;
        };
        const project = projectMap.get(l.project_id);
        if (!project) return null;
        return {
          project_id: l.project_id,
          title: project.title,
          ebook_type: project.ebook_type,
          status: project.status,
          relationship: l.relationship,
          is_primary: l.is_primary,
          source_is_newer: sourceIsNewer(
            offer.updated_at,
            l.source_offer_updated_at,
          ),
          updated_at: project.updated_at,
        };
      })
      .filter((x): x is OfferLinkedProjectSummary => x != null);

    return Response.json({ items });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Server error";
    return jsonError(message, 503, "unavailable");
  }
}
