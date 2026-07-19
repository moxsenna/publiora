import { createClient } from "@/lib/supabase/server";
import { jsonError } from "@/lib/api/errors";
import type { ProjectUpdate } from "@/types/project";
import {
  CTA_URL_REQUIRED_GOALS,
  isValidCtaUrl,
  type CtaGoal,
} from "@/types/ai-suggestions";

type RouteCtx = { params: Promise<{ id: string }> };

const VALID_CTA_GOALS: readonly CtaGoal[] = [
  "visit_product",
  "join_whatsapp",
  "claim_bonus",
  "buy_product",
  "follow_creator",
  "custom",
];

const PATCH_KEYS = [
  "title",
  "author",
  "subtitle",
  "description",
  "audience",
  "tone",
  "niche",
  "cover_color",
  "cta_goal",
  "final_cta",
  "cta_url",
] as const satisfies readonly (keyof ProjectUpdate)[];

export async function GET(_req: Request, ctx: RouteCtx) {
  try {
    const { id } = await ctx.params;
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
      .eq("id", id)
      .eq("owner_id", user.id)
      .maybeSingle();

    if (error) {
      return jsonError(error.message, 500, "db_error");
    }
    if (!data) {
      return jsonError("Project not found", 404, "not_found");
    }

    return Response.json(data);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Server error";
    return jsonError(message, 503, "unavailable");
  }
}

export async function PATCH(req: Request, ctx: RouteCtx) {
  try {
    const { id } = await ctx.params;
    const supabase = await createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return jsonError("Unauthorized", 401, "unauthorized");
    }

    const body = (await req.json().catch(() => null)) as ProjectUpdate | null;
    if (!body || typeof body !== "object") {
      return jsonError("Invalid body", 400, "validation_error");
    }

    const patch: ProjectUpdate = {};
    for (const key of PATCH_KEYS) {
      if (key in body && body[key] !== undefined) {
        patch[key] = body[key] as never;
      }
    }

    if (Object.keys(patch).length === 0) {
      return jsonError("No updatable fields provided", 400, "validation_error");
    }

    if ("cta_goal" in patch && patch.cta_goal !== null && patch.cta_goal !== undefined) {
      if (!(VALID_CTA_GOALS as readonly string[]).includes(patch.cta_goal)) {
        return jsonError(
          `Invalid cta_goal. Must be one of: ${VALID_CTA_GOALS.join(", ")}`,
          400,
          "validation_error",
        );
      }
    }

    // When setting a URL-required goal, require a valid cta_url in the same patch
    if (
      patch.cta_goal &&
      (CTA_URL_REQUIRED_GOALS as readonly string[]).includes(patch.cta_goal)
    ) {
      const url = patch.cta_url ?? null;
      if (url == null || !isValidCtaUrl(url)) {
        return jsonError(
          "cta_url must be a valid http(s) URL for this cta_goal",
          400,
          "validation_error",
        );
      }
    }
    // Reject invalid explicit cta_url values
    if ("cta_url" in patch && patch.cta_url != null && !isValidCtaUrl(patch.cta_url)) {
      return jsonError(
        "cta_url must be a valid http(s) URL",
        400,
        "validation_error",
      );
    }

    const { data, error } = await supabase
      .from("projects")
      .update(patch)
      .eq("id", id)
      .eq("owner_id", user.id)
      .select("*")
      .maybeSingle();

    if (error) {
      return jsonError(error.message, 500, "db_error");
    }
    if (!data) {
      return jsonError("Project not found", 404, "not_found");
    }

    return Response.json(data);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Server error";
    return jsonError(message, 503, "unavailable");
  }
}

export async function DELETE(_req: Request, ctx: RouteCtx) {
  try {
    const { id } = await ctx.params;
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
      .delete()
      .eq("id", id)
      .eq("owner_id", user.id)
      .select("id")
      .maybeSingle();

    if (error) {
      return jsonError(error.message, 500, "db_error");
    }
    if (!data) {
      return jsonError("Project not found", 404, "not_found");
    }

    return Response.json({ ok: true as const });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Server error";
    return jsonError(message, 503, "unavailable");
  }
}
