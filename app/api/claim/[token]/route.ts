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
        cta_goal: ebook.cta_goal ?? null,
        final_cta: ebook.final_cta ?? null,
        cta_url: ebook.cta_url ?? null,
      },
    });
  } catch (err) {
    console.error("Claim preview failed", err);
    return jsonError(
      "Layanan klaim sementara tidak tersedia.",
      503,
      "unavailable"
    );
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
        "Terlalu banyak percobaan klaim. Coba lagi beberapa saat.",
        429,
        "rate_limited"
      );
    }
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return jsonError("Unauthorized", 401, "unauthorized");

    // Delegate to claim_ebook_access_v2: the RPC locks the claim link row,
    // validates status/expiry/usage, and performs the entitlement insert +
    // counters + claim event in ONE transaction. Concurrent duplicate claims
    // serialize on the row lock, so a claim is granted once and
    // already-owned requests never consume a slot. The RPC reads auth.uid(),
    // so it must run under the caller's JWT (not the service-role client).
    const { data: rpcResult, error: rpcError } = await supabase.rpc(
      "claim_ebook_access_v2",
      { p_token: token.toUpperCase() }
    );

    if (rpcError) {
      console.error("Claim RPC failed", rpcError);
      return jsonError(
        "Layanan klaim sementara tidak tersedia.",
        500,
        "db_error"
      );
    }

    const result = (rpcResult ?? {}) as {
      status?: string;
      ebook?: unknown;
      entitlement?: unknown;
    };

    if (result.status === "revoked") {
      return Response.json({ status: "revoked" });
    }
    if (result.status === "expired") {
      return Response.json({ status: "expired" });
    }
    if (result.status === "limit_reached") {
      return Response.json({ status: "limit_reached" });
    }
    if (result.status === "already_owned") {
      return Response.json({
        status: "already_owned",
        ebook: result.ebook ?? null,
      });
    }
    if (result.status === "claimed") {
      return Response.json({
        status: "claimed",
        ebook: result.ebook ?? null,
        entitlement: result.entitlement ?? null,
      });
    }
    if (result.status === "not_found") {
      return Response.json({ status: "not_found" });
    }

    // Unknown status payload — fail safe without echoing the detail.
    console.error("Claim RPC returned unexpected status", result.status);
    return jsonError(
      "Layanan klaim sementara tidak tersedia.",
      503,
      "unavailable"
    );
  } catch (err) {
    console.error("Claim failed", err);
    return jsonError(
      "Layanan klaim sementara tidak tersedia.",
      503,
      "unavailable"
    );
  }
}
