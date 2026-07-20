import { createClient } from "@/lib/supabase/server";
import { jsonError } from "@/lib/api/errors";
import { patchOfferSchema } from "@/lib/offers/schemas";
import { mapOfferRow } from "@/lib/offers/map-row";
import { sourceIsNewer } from "@/lib/offers/snapshot";
import type { OfferLinkedProjectSummary, ProjectOfferRelationship } from "@/types/offer";

type RouteCtx = { params: Promise<{ offerId: string }> };

async function loadOwnOffer(
  supabase: Awaited<ReturnType<typeof createClient>>,
  offerId: string,
  userId: string,
) {
  return supabase
    .from("offers")
    .select("*")
    .eq("id", offerId)
    .eq("owner_id", userId)
    .maybeSingle();
}

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

    const { data, error } = await loadOwnOffer(supabase, offerId, user.id);
    if (error) {
      return jsonError(error.message, 500, "db_error");
    }
    if (!data) {
      return jsonError("Offer not found", 404, "not_found");
    }

    const offer = mapOfferRow(data as Record<string, unknown>);

    const { data: links, error: linkErr } = await supabase
      .from("project_offer_links")
      .select("id, project_id, relationship, is_primary, source_offer_updated_at, updated_at")
      .eq("offer_id", offerId);

    if (linkErr) {
      return jsonError(linkErr.message, 500, "db_error");
    }

    const projectIds = (links ?? []).map(
      (l) => (l as { project_id: string }).project_id,
    );
    const projectMap = new Map<
      string,
      { title: string; ebook_type: string; status: string; updated_at: string }
    >();

    if (projectIds.length > 0) {
      const { data: projects, error: pErr } = await supabase
        .from("projects")
        .select("id, title, ebook_type, status, updated_at, owner_id")
        .in("id", projectIds)
        .eq("owner_id", user.id);
      if (pErr) {
        return jsonError(pErr.message, 500, "db_error");
      }
      for (const p of projects ?? []) {
        const row = p as {
          id: string;
          title: string;
          ebook_type: string;
          status: string;
          updated_at: string;
        };
        projectMap.set(row.id, {
          title: row.title,
          ebook_type: row.ebook_type,
          status: row.status,
          updated_at: row.updated_at,
        });
      }
    }

    const linked_projects: OfferLinkedProjectSummary[] = (links ?? [])
      .map((link) => {
        const l = link as {
          project_id: string;
          relationship: ProjectOfferRelationship;
          is_primary: boolean;
          source_offer_updated_at: string;
          updated_at: string;
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

    return Response.json({ offer, linked_projects });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Server error";
    return jsonError(message, 503, "unavailable");
  }
}

export async function PATCH(req: Request, ctx: RouteCtx) {
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

    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return jsonError("Invalid JSON body", 400, "validation_error");
    }

    const parsed = patchOfferSchema.safeParse(body);
    if (!parsed.success) {
      const first = parsed.error.issues[0];
      return jsonError(
        first?.message ?? "validation error",
        400,
        "validation_error",
        { issues: parsed.error.issues },
      );
    }

    const { data: existing, error: loadErr } = await loadOwnOffer(
      supabase,
      offerId,
      user.id,
    );
    if (loadErr) {
      return jsonError(loadErr.message, 500, "db_error");
    }
    if (!existing) {
      return jsonError("Offer not found", 404, "not_found");
    }

    const patch: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(parsed.data)) {
      if (value !== undefined) patch[key] = value;
    }

    if (Object.keys(patch).length === 0) {
      return jsonError("No updatable fields provided", 400, "validation_error");
    }

    const { data, error } = await supabase
      .from("offers")
      .update(patch)
      .eq("id", offerId)
      .eq("owner_id", user.id)
      .select("*")
      .single();

    if (error || !data) {
      return jsonError(
        error?.message ?? "Failed to update offer",
        500,
        "db_error",
      );
    }

    const offer = mapOfferRow(data as Record<string, unknown>);

    // Count links whose snapshot is now stale relative to new updated_at
    const { data: links, error: linkErr } = await supabase
      .from("project_offer_links")
      .select("source_offer_updated_at")
      .eq("offer_id", offerId);

    if (linkErr) {
      return jsonError(linkErr.message, 500, "db_error");
    }

    const stale_project_count = (links ?? []).filter((l) =>
      sourceIsNewer(
        offer.updated_at,
        String((l as { source_offer_updated_at: string }).source_offer_updated_at),
      ),
    ).length;

    return Response.json({ offer, stale_project_count });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Server error";
    return jsonError(message, 503, "unavailable");
  }
}

/** Archive rather than hard-delete. */
export async function DELETE(_req: Request, ctx: RouteCtx) {
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

    const { data: existing, error: loadErr } = await loadOwnOffer(
      supabase,
      offerId,
      user.id,
    );
    if (loadErr) {
      return jsonError(loadErr.message, 500, "db_error");
    }
    if (!existing) {
      return jsonError("Offer not found", 404, "not_found");
    }

    const { error } = await supabase
      .from("offers")
      .update({ status: "archived" })
      .eq("id", offerId)
      .eq("owner_id", user.id);

    if (error) {
      return jsonError(error.message, 500, "db_error");
    }

    return Response.json({ archived: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Server error";
    return jsonError(message, 503, "unavailable");
  }
}
