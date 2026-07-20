import { createClient } from "@/lib/supabase/server";
import { jsonError } from "@/lib/api/errors";
import { linkOfferToProjectSchema } from "@/lib/offers/schemas";
import {
  assertRelationshipAllowed,
  isRelationshipAllowed,
} from "@/lib/offers/relationship-rules";
import { buildOfferContextSnapshot, sourceIsNewer } from "@/lib/offers/snapshot";
import { mapOfferRow, mapProjectOfferLinkRow } from "@/lib/offers/map-row";
import type { EbookType } from "@/types/project";
import type { ProjectOfferRelationship } from "@/types/offer";

type RouteCtx = { params: Promise<{ id: string }> };

async function loadOwnedProject(
  supabase: Awaited<ReturnType<typeof createClient>>,
  projectId: string,
  userId: string,
) {
  return supabase
    .from("projects")
    .select("id, owner_id, ebook_type, cta_url, audience, niche")
    .eq("id", projectId)
    .eq("owner_id", userId)
    .maybeSingle();
}

export async function GET(_req: Request, ctx: RouteCtx) {
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

    const { data: project, error: pErr } = await loadOwnedProject(
      supabase,
      projectId,
      user.id,
    );
    if (pErr) return jsonError(pErr.message, 500, "db_error");
    if (!project) return jsonError("Project not found", 404, "not_found");

    const { data: links, error: linkErr } = await supabase
      .from("project_offer_links")
      .select("*")
      .eq("project_id", projectId)
      .order("is_primary", { ascending: false });

    if (linkErr) return jsonError(linkErr.message, 500, "db_error");

    const items = [];
    for (const row of links ?? []) {
      const link = mapProjectOfferLinkRow(row as Record<string, unknown>);
      const { data: offerRow } = await supabase
        .from("offers")
        .select("*")
        .eq("id", link.offer_id)
        .eq("owner_id", user.id)
        .maybeSingle();

      if (!offerRow) continue;
      const offer = mapOfferRow(offerRow as Record<string, unknown>);
      items.push({
        link,
        offer,
        source_is_newer: sourceIsNewer(
          offer.updated_at,
          link.source_offer_updated_at,
        ),
      });
    }

    return Response.json({ items });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Server error";
    return jsonError(message, 503, "unavailable");
  }
}

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

    const parsed = linkOfferToProjectSchema.safeParse(body);
    if (!parsed.success) {
      const first = parsed.error.issues[0];
      return jsonError(
        first?.message ?? "validation error",
        400,
        "validation_error",
        { issues: parsed.error.issues },
      );
    }

    const { offer_id, relationship, is_primary, replace_primary } = parsed.data;

    const { data: project, error: pErr } = await loadOwnedProject(
      supabase,
      projectId,
      user.id,
    );
    if (pErr) return jsonError(pErr.message, 500, "db_error");
    if (!project) return jsonError("Project not found", 404, "not_found");

    const ebookType = String(project.ebook_type) as EbookType;
    if (
      !isRelationshipAllowed({
        ebookType,
        relationship: relationship as ProjectOfferRelationship,
      })
    ) {
      return jsonError(
        `Relasi ${relationship} tidak valid untuk tipe ${ebookType}`,
        400,
        "invalid_relationship",
      );
    }

    try {
      assertRelationshipAllowed({
        ebookType,
        relationship: relationship as ProjectOfferRelationship,
      });
    } catch {
      return jsonError("invalid relationship", 400, "invalid_relationship");
    }

    const { data: offerRow, error: oErr } = await supabase
      .from("offers")
      .select("*")
      .eq("id", offer_id)
      .eq("owner_id", user.id)
      .maybeSingle();

    if (oErr) return jsonError(oErr.message, 500, "db_error");
    if (!offerRow) {
      return jsonError("Offer not found", 404, "not_found");
    }

    const offer = mapOfferRow(offerRow as Record<string, unknown>);
    if (offer.status === "archived") {
      return jsonError(
        "Offer diarsipkan tidak dapat ditautkan ke proyek baru",
        400,
        "offer_archived",
      );
    }

    if (is_primary) {
      const { data: existingPrimary } = await supabase
        .from("project_offer_links")
        .select("id")
        .eq("project_id", projectId)
        .eq("is_primary", true)
        .maybeSingle();

      if (existingPrimary && !replace_primary) {
        return jsonError(
          "Proyek sudah punya penawaran utama. Set replace_primary=true untuk mengganti.",
          409,
          "primary_exists",
        );
      }

      if (existingPrimary && replace_primary) {
        const { error: delErr } = await supabase
          .from("project_offer_links")
          .delete()
          .eq("id", (existingPrimary as { id: string }).id);
        if (delErr) return jsonError(delErr.message, 500, "db_error");
      }
    }

    const snapshot = buildOfferContextSnapshot(offer);

    const { data: linkRow, error: linkErr } = await supabase
      .from("project_offer_links")
      .insert({
        project_id: projectId,
        offer_id: offer.id,
        relationship,
        is_primary,
        context_snapshot: snapshot,
        source_offer_updated_at: offer.updated_at,
        synced_at: new Date().toISOString(),
      })
      .select("*")
      .single();

    if (linkErr || !linkRow) {
      return jsonError(
        linkErr?.message ?? "Failed to link offer",
        500,
        "db_error",
      );
    }

    // Prefill project CTA URL when empty
    if (
      (!project.cta_url || String(project.cta_url).trim() === "") &&
      offer.destination_url
    ) {
      await supabase
        .from("projects")
        .update({ cta_url: offer.destination_url })
        .eq("id", projectId)
        .eq("owner_id", user.id);
    }

    // Seed strategy product_or_offer when empty
    const { data: stateRow } = await supabase
      .from("project_states")
      .select("state_json, readiness_score")
      .eq("project_id", projectId)
      .maybeSingle();

    if (stateRow?.state_json && typeof stateRow.state_json === "object") {
      const state = stateRow.state_json as {
        strategy?: Record<string, unknown>;
      };
      const strategy = { ...(state.strategy ?? {}) };
      let changed = false;
      if (!strategy.product_or_offer) {
        strategy.product_or_offer = offer.name;
        changed = true;
      }
      if (!strategy.audience && offer.target_audience) {
        strategy.audience = offer.target_audience;
        changed = true;
      }
      if (!strategy.primary_problem && offer.primary_problem) {
        strategy.primary_problem = offer.primary_problem;
        changed = true;
      }
      if (changed) {
        await supabase
          .from("project_states")
          .update({
            state_json: { ...state, strategy },
          })
          .eq("project_id", projectId);
      }
    }

    const link = mapProjectOfferLinkRow(linkRow as Record<string, unknown>);
    return Response.json({ link, offer }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Server error";
    return jsonError(message, 503, "unavailable");
  }
}

export async function DELETE(req: Request, ctx: RouteCtx) {
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

    const url = new URL(req.url);
    const linkId = url.searchParams.get("link_id");

    const { data: project, error: pErr } = await loadOwnedProject(
      supabase,
      projectId,
      user.id,
    );
    if (pErr) return jsonError(pErr.message, 500, "db_error");
    if (!project) return jsonError("Project not found", 404, "not_found");

    const ebookType = String(project.ebook_type) as EbookType;

    let query = supabase
      .from("project_offer_links")
      .select("*")
      .eq("project_id", projectId);

    if (linkId) {
      query = query.eq("id", linkId);
    } else {
      query = query.eq("is_primary", true);
    }

    const { data: linkRow, error: linkErr } = await query.maybeSingle();
    if (linkErr) return jsonError(linkErr.message, 500, "db_error");
    if (!linkRow) return jsonError("Link not found", 404, "not_found");

    const link = mapProjectOfferLinkRow(linkRow as Record<string, unknown>);

    if (
      ebookType === "bonus_product" &&
      link.is_primary &&
      link.relationship === "bonus_for"
    ) {
      return jsonError(
        "Bonus Pembelian membutuhkan produk utama. Ganti penawaran atau ubah tipe ebook dulu.",
        400,
        "bonus_requires_offer",
      );
    }

    const { error: delErr } = await supabase
      .from("project_offer_links")
      .delete()
      .eq("id", link.id)
      .eq("project_id", projectId);

    if (delErr) return jsonError(delErr.message, 500, "db_error");

    return Response.json({ detached: true, link_id: link.id });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Server error";
    return jsonError(message, 503, "unavailable");
  }
}
