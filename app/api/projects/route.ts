import { createClient } from "@/lib/supabase/server";
import { jsonError } from "@/lib/api/errors";
import {
  createProjectRequestV2Schema,
  createProjectRequestV3Schema,
  isCreateProjectV2,
  isCreateProjectV3,
  legacyProjectInputSchema,
} from "@/lib/projects/create-project-schema";
import {
  normalizeCreateProjectV2,
  normalizeCreateProjectV3,
  normalizeLegacyCreateProject,
} from "@/lib/projects/normalize-create-project";
import { isTemplateCompatible } from "@/lib/templates-catalog";
import { mapOfferRow } from "@/lib/offers/map-row";
import type { EbookType } from "@/types/project";

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return jsonError("Unauthorized", 401, "unauthorized");
    }

    const { data, error } = await supabase
      .from("projects")
      .select("*")
      .eq("owner_id", user.id)
      .order("updated_at", { ascending: false });

    if (error) {
      return jsonError(error.message, 500, "db_error");
    }

    return Response.json(data ?? []);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Server error";
    return jsonError(message, 503, "unavailable");
  }
}

export async function POST(req: Request) {
  try {
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

    // ---- V3 offer-aware create ----
    if (isCreateProjectV3(body)) {
      const parsed = createProjectRequestV3Schema.safeParse(body);
      if (!parsed.success) {
        const first = parsed.error.issues[0];
        return jsonError(
          first?.message ?? "validation error",
          400,
          "validation_error",
          { issues: parsed.error.issues },
        );
      }

      let offerPrefill: {
        name?: string | null;
        target_audience?: string | null;
        primary_problem?: string | null;
        niche?: string | null;
        destination_url?: string | null;
      } | null = null;

      if (parsed.data.offer_context.mode === "existing") {
        const { data: offerRow, error: oErr } = await supabase
          .from("offers")
          .select("*")
          .eq("id", parsed.data.offer_context.offer_id)
          .eq("owner_id", user.id)
          .maybeSingle();
        if (oErr) return jsonError(oErr.message, 500, "db_error");
        if (!offerRow) {
          return jsonError("Offer not found", 404, "not_found");
        }
        const offer = mapOfferRow(offerRow as Record<string, unknown>);
        if (offer.status === "archived") {
          return jsonError("Offer diarsipkan", 400, "offer_archived");
        }
        offerPrefill = {
          name: offer.name,
          target_audience: offer.target_audience,
          primary_problem: offer.primary_problem,
          niche: offer.niche,
          destination_url: offer.destination_url,
        };
      } else if (parsed.data.offer_context.mode === "quick_create") {
        const o = parsed.data.offer_context.offer;
        offerPrefill = {
          name: o.name,
          target_audience: o.target_audience,
          primary_problem: null,
          niche: o.niche,
          destination_url: o.destination_url,
        };
      }

      const normalized = normalizeCreateProjectV3(
        parsed.data,
        user.id,
        offerPrefill,
      );

      const ebookType = normalized.projectInsert.ebook_type as EbookType;
      const templateId = normalized.projectInsert.template_id;
      if (!isTemplateCompatible(templateId, ebookType)) {
        return jsonError(
          "Template ini tidak tersedia untuk tipe ebook yang dipilih.",
          400,
          "invalid_template",
        );
      }

      const rpcArgs: Record<string, unknown> = {
        p_project: normalized.projectInsert,
        p_state: normalized.initialState,
        p_readiness_score: normalized.readinessScore,
        p_existing_offer_id: null,
        p_new_offer: null,
        p_relationship: null,
      };

      if (normalized.offerLink.mode === "existing") {
        rpcArgs.p_existing_offer_id = normalized.offerLink.offer_id;
        rpcArgs.p_relationship = normalized.offerLink.relationship;
      } else if (normalized.offerLink.mode === "quick_create") {
        rpcArgs.p_new_offer = normalized.offerLink.offer;
        rpcArgs.p_relationship = normalized.offerLink.relationship;
      }

      const { data: rpcResult, error: rpcError } = await supabase.rpc(
        "create_project_with_context_v3",
        rpcArgs,
      );

      if (rpcError || !rpcResult) {
        // Fallback non-atomic path when RPC missing (dev)
        if (
          rpcError?.message?.includes("create_project_with_context_v3") ||
          rpcError?.code === "PGRST202" ||
          rpcError?.code === "42883"
        ) {
          return await fallbackCreateV3(supabase, user.id, normalized);
        }
        return jsonError(
          rpcError?.message ?? "Failed to create project",
          500,
          "db_error",
        );
      }

      const project =
        typeof rpcResult === "object" && rpcResult !== null && "project" in rpcResult
          ? (rpcResult as { project: unknown }).project
          : rpcResult;

      return Response.json(project, { status: 201 });
    }

    // ---- V2 ----
    let normalized;
    if (isCreateProjectV2(body)) {
      const parsed = createProjectRequestV2Schema.safeParse(body);
      if (!parsed.success) {
        const first = parsed.error.issues[0];
        return jsonError(
          first?.message ?? "validation error",
          400,
          "validation_error",
          { issues: parsed.error.issues },
        );
      }
      normalized = normalizeCreateProjectV2(parsed.data, user.id);
    } else {
      console.warn(
        "[projects] legacy ProjectInput create; migrate to CreateProjectRequestV2/V3",
      );
      const parsed = legacyProjectInputSchema.safeParse(body);
      if (!parsed.success) {
        const first = parsed.error.issues[0];
        return jsonError(
          first?.message ?? "validation error",
          400,
          "validation_error",
          { issues: parsed.error.issues },
        );
      }
      normalized = normalizeLegacyCreateProject(parsed.data, user.id);
    }

    const ebookType = normalized.projectInsert.ebook_type as EbookType;
    const templateId = normalized.projectInsert.template_id;
    if (!isTemplateCompatible(templateId, ebookType)) {
      return jsonError(
        "Template ini tidak tersedia untuk tipe ebook yang dipilih.",
        400,
        "invalid_template",
      );
    }

    const { data: project, error } = await supabase.rpc(
      "create_project_with_state",
      {
        p_project: normalized.projectInsert,
        p_state: normalized.initialState,
        p_readiness_score: normalized.readinessScore,
      },
    );

    if (error || !project) {
      if (
        error?.message?.includes("create_project_with_state") ||
        error?.code === "PGRST202" ||
        error?.code === "42883"
      ) {
        const insert = { ...normalized.projectInsert };
        const { data: created, error: insertErr } = await supabase
          .from("projects")
          .insert(insert)
          .select("*")
          .single();
        if (insertErr || !created) {
          return jsonError(
            insertErr?.message ?? "Failed to create project",
            500,
            "db_error",
          );
        }
        const { error: stateError } = await supabase
          .from("project_states")
          .insert({
            project_id: created.id,
            state_json: normalized.initialState,
            readiness_score: normalized.readinessScore,
          });
        if (stateError) {
          await supabase.from("projects").delete().eq("id", created.id);
          return jsonError(stateError.message, 500, "db_error");
        }
        return Response.json(created, { status: 201 });
      }

      return jsonError(
        error?.message ?? "Failed to create project",
        500,
        "db_error",
      );
    }

    return Response.json(project, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Server error";
    return jsonError(message, 503, "unavailable");
  }
}

async function fallbackCreateV3(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  normalized: ReturnType<typeof normalizeCreateProjectV3>,
) {
  let offerId: string | null = null;

  try {
    if (normalized.offerLink.mode === "quick_create") {
      const { data: offer, error: oErr } = await supabase
        .from("offers")
        .insert({
          owner_id: userId,
          ...normalized.offerLink.offer,
          status: "active",
          primary_problem: null,
        })
        .select("*")
        .single();
      if (oErr || !offer) {
        return jsonError(oErr?.message ?? "offer create failed", 500, "db_error");
      }
      offerId = offer.id as string;
    } else if (normalized.offerLink.mode === "existing") {
      offerId = normalized.offerLink.offer_id;
    }

    const { data: created, error: insertErr } = await supabase
      .from("projects")
      .insert(normalized.projectInsert)
      .select("*")
      .single();
    if (insertErr || !created) {
      if (offerId && normalized.offerLink.mode === "quick_create") {
        await supabase.from("offers").delete().eq("id", offerId);
      }
      return jsonError(
        insertErr?.message ?? "Failed to create project",
        500,
        "db_error",
      );
    }

    const { error: stateError } = await supabase.from("project_states").insert({
      project_id: created.id,
      state_json: normalized.initialState,
      readiness_score: normalized.readinessScore,
    });
    if (stateError) {
      await supabase.from("projects").delete().eq("id", created.id);
      if (offerId && normalized.offerLink.mode === "quick_create") {
        await supabase.from("offers").delete().eq("id", offerId);
      }
      return jsonError(stateError.message, 500, "db_error");
    }

    if (offerId && normalized.offerLink.mode !== "none") {
      const offerLink = normalized.offerLink;
      const { data: offerRow } = await supabase
        .from("offers")
        .select("*")
        .eq("id", offerId)
        .single();
      if (offerRow) {
        const offer = mapOfferRow(offerRow as Record<string, unknown>);
        const { buildOfferContextSnapshot } = await import(
          "@/lib/offers/snapshot"
        );
        const snapshot = buildOfferContextSnapshot(offer);
        const relationship = offerLink.relationship;
        const { error: linkErr } = await supabase
          .from("project_offer_links")
          .insert({
            project_id: created.id,
            offer_id: offerId,
            relationship,
            is_primary: true,
            context_snapshot: snapshot,
            source_offer_updated_at: offer.updated_at,
          });
        if (linkErr) {
          await supabase.from("project_states").delete().eq("project_id", created.id);
          await supabase.from("projects").delete().eq("id", created.id);
          if (normalized.offerLink.mode === "quick_create") {
            await supabase.from("offers").delete().eq("id", offerId);
          }
          return jsonError(linkErr.message, 500, "db_error");
        }
      }
    }

    return Response.json(created, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Server error";
    return jsonError(message, 500, "db_error");
  }
}
