import { createClient } from "@/lib/supabase/server";
import { jsonError } from "@/lib/api/errors";
import { syncProjectOfferSchema } from "@/lib/offers/schemas";
import {
  applySnapshotFields,
  buildOfferContextSnapshot,
  diffOfferSnapshot,
  type SyncableOfferField,
} from "@/lib/offers/snapshot";
import { mapOfferRow, mapProjectOfferLinkRow } from "@/lib/offers/map-row";

type RouteCtx = { params: Promise<{ id: string }> };

export async function POST(req: Request, ctx: RouteCtx) {
  try {
    const { id: projectId } = await ctx.params;
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

    const parsed = syncProjectOfferSchema.safeParse(body);
    if (!parsed.success) {
      const first = parsed.error.issues[0];
      return jsonError(
        first?.message ?? "validation error",
        400,
        "validation_error",
        { issues: parsed.error.issues },
      );
    }

    const { link_id, fields, apply_to_strategy, apply_to_project_cta } =
      parsed.data;

    const { data: project, error: pErr } = await supabase
      .from("projects")
      .select("id, owner_id, cta_url, niche, audience")
      .eq("id", projectId)
      .eq("owner_id", user.id)
      .maybeSingle();

    if (pErr) return jsonError(pErr.message, 500, "db_error");
    if (!project) return jsonError("Project not found", 404, "not_found");

    const { data: linkRow, error: linkErr } = await supabase
      .from("project_offer_links")
      .select("*")
      .eq("id", link_id)
      .eq("project_id", projectId)
      .maybeSingle();

    if (linkErr) return jsonError(linkErr.message, 500, "db_error");
    if (!linkRow) return jsonError("Link not found", 404, "not_found");

    const link = mapProjectOfferLinkRow(linkRow as Record<string, unknown>);

    const { data: offerRow, error: oErr } = await supabase
      .from("offers")
      .select("*")
      .eq("id", link.offer_id)
      .eq("owner_id", user.id)
      .maybeSingle();

    if (oErr) return jsonError(oErr.message, 500, "db_error");
    if (!offerRow) return jsonError("Offer not found", 404, "not_found");

    const offer = mapOfferRow(offerRow as Record<string, unknown>);
    const liveSnapshot = buildOfferContextSnapshot(offer);
    const currentSnapshot = link.context_snapshot;
    const fullDiff = diffOfferSnapshot(currentSnapshot, liveSnapshot);

    const selected = fields as SyncableOfferField[];
    const selectedDiff = fullDiff.filter((d) => selected.includes(d.field));

    const nextSnapshot = applySnapshotFields(
      currentSnapshot,
      liveSnapshot,
      selected,
    );

    const now = new Date().toISOString();
    const { data: updatedLink, error: updErr } = await supabase
      .from("project_offer_links")
      .update({
        context_snapshot: nextSnapshot,
        source_offer_updated_at: offer.updated_at,
        synced_at: now,
      })
      .eq("id", link.id)
      .eq("project_id", projectId)
      .select("*")
      .single();

    if (updErr || !updatedLink) {
      return jsonError(
        updErr?.message ?? "Failed to sync offer context",
        500,
        "db_error",
      );
    }

    const projectPatch: Record<string, unknown> = {};
    if (apply_to_project_cta && selected.includes("destination_url")) {
      projectPatch.cta_url = nextSnapshot.destination_url;
    }
    if (selected.includes("niche") && nextSnapshot.niche) {
      // niche is a project field; apply only when explicitly selected
      projectPatch.niche = nextSnapshot.niche;
    }
    if (Object.keys(projectPatch).length > 0) {
      await supabase
        .from("projects")
        .update(projectPatch)
        .eq("id", projectId)
        .eq("owner_id", user.id);
    }

    if (apply_to_strategy) {
      const { data: stateRow } = await supabase
        .from("project_states")
        .select("state_json")
        .eq("project_id", projectId)
        .maybeSingle();

      if (stateRow?.state_json && typeof stateRow.state_json === "object") {
        const state = stateRow.state_json as {
          strategy?: Record<string, unknown>;
        };
        const strategy = { ...(state.strategy ?? {}) };
        if (selected.includes("name")) {
          strategy.product_or_offer = nextSnapshot.name;
        }
        if (selected.includes("target_audience")) {
          strategy.audience = nextSnapshot.target_audience;
        }
        if (selected.includes("primary_problem")) {
          strategy.primary_problem = nextSnapshot.primary_problem;
        }
        // Never touch generated content fields
        await supabase
          .from("project_states")
          .update({
            state_json: { ...state, strategy },
          })
          .eq("project_id", projectId);
      }
    }

    return Response.json({
      link: mapProjectOfferLinkRow(updatedLink as Record<string, unknown>),
      changed_fields: selectedDiff,
      snapshot: nextSnapshot,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Server error";
    return jsonError(message, 503, "unavailable");
  }
}
