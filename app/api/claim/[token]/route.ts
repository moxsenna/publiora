import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { jsonError } from "@/lib/api/errors";
import { rateLimit } from "@/lib/rate-limit";
import { headers } from "next/headers";

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ token: string }> }
) {
  // Preview claim link validity without consuming
  try {
    const { token } = await ctx.params;
    const admin = createAdminClient();
    const { data: link } = await admin
      .from("claim_links")
      .select("*")
      .eq("token", token.toUpperCase())
      .maybeSingle();

    if (!link) return Response.json({ status: "not_found" });
    if (link.status === "revoked") return Response.json({ status: "revoked" });
    if (
      link.status === "expired" ||
      (link.expires_at && new Date(link.expires_at).getTime() < Date.now())
    ) {
      return Response.json({ status: "expired" });
    }
    if (link.max_uses != null && link.used_count >= link.max_uses) {
      return Response.json({ status: "limit_reached" });
    }

    const { data: ebook } = await admin
      .from("published_ebooks")
      .select("*")
      .eq("id", link.ebook_id)
      .maybeSingle();

    if (!ebook) return Response.json({ status: "not_found" });

    return Response.json({
      status: "ready",
      token: link.token,
      ebook: {
        id: ebook.id,
        project_id: ebook.project_id,
        slug: ebook.slug,
        title: ebook.title,
        author: ebook.author,
        subtitle: ebook.subtitle,
        cover_color: ebook.cover_color,
        sections: ebook.sections ?? [],
        published_at: ebook.published_at,
        total_readers: ebook.total_readers ?? 0,
        active_claims: ebook.active_claims ?? 0,
        is_public: ebook.is_public,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Server error";
    return jsonError(message, 503, "unavailable");
  }
}

export async function POST(
  _req: Request,
  ctx: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await ctx.params;
    const h = await headers();
    const ip =
      h.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      h.get("x-real-ip") ||
      "unknown";
    const rl = rateLimit({
      key: `claim:${ip}:${token.toUpperCase()}`,
      limit: 20,
      windowMs: 60_000,
    });
    if (!rl.ok) {
      return jsonError(
        `Terlalu banyak percobaan claim. Coba lagi dalam ${rl.retryAfterSec}s.`,
        429,
        "rate_limited"
      );
    }
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return jsonError("Unauthorized", 401, "unauthorized");

    const admin = createAdminClient();
    const { data: link } = await admin
      .from("claim_links")
      .select("*")
      .eq("token", token.toUpperCase())
      .maybeSingle();

    if (!link) return Response.json({ status: "not_found" });
    if (link.status === "revoked") {
      await admin.from("claim_events").insert({
        claim_link_id: link.id,
        reader_email: user.email ?? user.id,
        status: "revoked",
      });
      return Response.json({ status: "revoked" });
    }
    if (
      link.status === "expired" ||
      (link.expires_at && new Date(link.expires_at).getTime() < Date.now())
    ) {
      await admin
        .from("claim_links")
        .update({ status: "expired" })
        .eq("id", link.id);
      await admin.from("claim_events").insert({
        claim_link_id: link.id,
        reader_email: user.email ?? user.id,
        status: "expired",
      });
      return Response.json({ status: "expired" });
    }
    if (link.max_uses != null && link.used_count >= link.max_uses) {
      await admin.from("claim_events").insert({
        claim_link_id: link.id,
        reader_email: user.email ?? user.id,
        status: "limit_reached",
      });
      return Response.json({ status: "limit_reached" });
    }

    const { data: ebook } = await admin
      .from("published_ebooks")
      .select("*")
      .eq("id", link.ebook_id)
      .maybeSingle();
    if (!ebook) return Response.json({ status: "not_found" });

    const mappedEbook = {
      id: ebook.id,
      project_id: ebook.project_id,
      slug: ebook.slug,
      title: ebook.title,
      author: ebook.author,
      subtitle: ebook.subtitle,
      cover_color: ebook.cover_color,
      sections: ebook.sections ?? [],
      published_at: ebook.published_at,
      total_readers: ebook.total_readers ?? 0,
      active_claims: ebook.active_claims ?? 0,
      is_public: ebook.is_public,
    };

    const { data: existing } = await admin
      .from("entitlements")
      .select("*")
      .eq("ebook_id", ebook.id)
      .eq("reader_id", user.id)
      .maybeSingle();

    if (existing) {
      await admin.from("claim_events").insert({
        claim_link_id: link.id,
        reader_email: user.email ?? user.id,
        status: "already_owned",
      });
      return Response.json({ status: "already_owned", ebook: mappedEbook });
    }

    const { data: ent, error: entErr } = await admin
      .from("entitlements")
      .insert({
        reader_id: user.id,
        ebook_id: ebook.id,
        ebook_title: ebook.title,
        ebook_slug: ebook.slug,
        cover_color: ebook.cover_color,
        author: ebook.author,
        claim_link_id: link.id,
      })
      .select("*")
      .single();

    if (entErr) return jsonError(entErr.message, 500, "db_error");

    await admin
      .from("claim_links")
      .update({ used_count: (link.used_count ?? 0) + 1 })
      .eq("id", link.id);

    await admin.from("claim_events").insert({
      claim_link_id: link.id,
      reader_email: user.email ?? user.id,
      status: "claimed",
    });

    await admin
      .from("published_ebooks")
      .update({ total_readers: (ebook.total_readers ?? 0) + 1 })
      .eq("id", ebook.id);

    return Response.json({
      status: "claimed",
      ebook: mappedEbook,
      entitlement: {
        id: ent.id,
        reader_id: ent.reader_id,
        ebook_id: ent.ebook_id,
        ebook_title: ent.ebook_title,
        ebook_slug: ent.ebook_slug,
        cover_color: ent.cover_color,
        author: ent.author,
        claim_link_id: ent.claim_link_id,
        created_at: ent.created_at,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Server error";
    return jsonError(message, 503, "unavailable");
  }
}
