import { createClient } from "@/lib/supabase/server";
import { jsonError } from "@/lib/api/errors";
import {
  createOfferSchema,
  quickCreateOfferSchema,
} from "@/lib/offers/schemas";
import { mapOfferRow, offerInsertFromCreate } from "@/lib/offers/map-row";
import type { Offer } from "@/types/offer";

export async function GET(req: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return jsonError("Unauthorized", 401, "unauthorized");
    }

    const url = new URL(req.url);
    const status = url.searchParams.get("status") ?? "active";
    const search = url.searchParams.get("search")?.trim() ?? "";
    const limitRaw = Number(url.searchParams.get("limit") ?? "50");
    const limit = Number.isFinite(limitRaw)
      ? Math.min(Math.max(limitRaw, 1), 100)
      : 50;
    const cursor = url.searchParams.get("cursor");

    let query = supabase
      .from("offers")
      .select("*")
      .eq("owner_id", user.id)
      .order("updated_at", { ascending: false })
      .order("id", { ascending: false })
      .limit(limit + 1);

    if (status === "active" || status === "archived") {
      query = query.eq("status", status);
    } else if (status !== "all") {
      return jsonError(
        "status must be active, archived, or all",
        400,
        "validation_error",
      );
    }

    if (search) {
      query = query.ilike("name", `%${search}%`);
    }

    if (cursor) {
      // cursor format: updated_at|id
      const [updatedAt, id] = cursor.split("|");
      if (!updatedAt || !id) {
        return jsonError("Invalid cursor", 400, "validation_error");
      }
      query = query.or(
        `updated_at.lt.${updatedAt},and(updated_at.eq.${updatedAt},id.lt.${id})`,
      );
    }

    const { data, error } = await query;
    if (error) {
      return jsonError(error.message, 500, "db_error");
    }

    const rows = data ?? [];
    const hasMore = rows.length > limit;
    const page = hasMore ? rows.slice(0, limit) : rows;
    const offers = page.map((row) => mapOfferRow(row as Record<string, unknown>));

    // linked project counts for page items
    const ids = offers.map((o) => o.id);
    const countMap = new Map<string, number>();
    if (ids.length > 0) {
      const { data: links, error: linkErr } = await supabase
        .from("project_offer_links")
        .select("offer_id")
        .in("offer_id", ids);
      if (linkErr) {
        return jsonError(linkErr.message, 500, "db_error");
      }
      for (const link of links ?? []) {
        const oid = String((link as { offer_id: string }).offer_id);
        countMap.set(oid, (countMap.get(oid) ?? 0) + 1);
      }
    }

    const items = offers.map((offer) => ({
      ...offer,
      linked_project_count: countMap.get(offer.id) ?? 0,
    }));

    let next_cursor: string | null = null;
    if (hasMore && page.length > 0) {
      const last = page[page.length - 1] as { updated_at: string; id: string };
      next_cursor = `${last.updated_at}|${last.id}`;
    }

    return Response.json({ items, next_cursor });
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

    // Accept full create or quick-create shapes
    const full = createOfferSchema.safeParse(body);
    const quick = !full.success
      ? quickCreateOfferSchema.safeParse(body)
      : null;
    const parsed = full.success ? full : quick;

    if (!parsed || !parsed.success) {
      const issues = full.success
        ? []
        : full.error.issues;
      const first = issues[0] ?? quick?.error?.issues[0];
      return jsonError(
        first?.message ?? "validation error",
        400,
        "validation_error",
        { issues: full.success ? quick?.error?.issues : full.error.issues },
      );
    }

    const insert = offerInsertFromCreate(parsed.data, user.id);
    const { data, error } = await supabase
      .from("offers")
      .insert(insert)
      .select("*")
      .single();

    if (error || !data) {
      return jsonError(
        error?.message ?? "Failed to create offer",
        500,
        "db_error",
      );
    }

    const offer: Offer = mapOfferRow(data as Record<string, unknown>);
    return Response.json({ offer }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Server error";
    return jsonError(message, 503, "unavailable");
  }
}
