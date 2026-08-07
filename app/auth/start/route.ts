import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { resolveAuthCookieDomain } from "@/lib/supabase/cookie-options";
import { buildAppUrl } from "@/lib/urls";
import {
  createSignupContextToken,
  signupContextExpiresAt,
  buildSignupContextCookie,
} from "@/lib/auth/signup-context";
import {
  approveClaimReturnPath,
  normalizeClaimToken,
} from "@/lib/auth/return-path";

// /auth/start opens the signup funnel from two entry points:
// - landing_page (marketing site): intent=creator, return to /dashboard;
// - claim_link (claim page)      : intent=reader, records claim + ebook +
//   creator attribution, returns to /claim/:token.
//
// Creates a short-lived signup_context (only the SHA-256 token hash is
// stored) and hands the raw token to the browser as an HttpOnly cookie.
// All redirects are closed-set (app /register) — user input never becomes
// a redirect target.

async function forwardToRegister(returnPath?: string): Promise<Response> {
  return NextResponse.redirect(registerUrl(returnPath));
}

// The return path is already validated server-side at context creation, so
// echoing it into the query is safe: the register page re-approves it before
// navigating, and anything non-claim falls back to /dashboard.
function registerUrl(returnPath?: string): URL {
  const url = new URL(buildAppUrl("/register"));
  if (returnPath) url.searchParams.set("return_to", returnPath);
  return url;
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const source = url.searchParams.get("source");
    const claimTokenRaw = url.searchParams.get("claim_token");
    const returnToRaw = url.searchParams.get("return_to");

    const claimToken = normalizeClaimToken(claimTokenRaw ?? "");
    const returnPath = approveClaimReturnPath(returnToRaw, claimToken || null);

    if (source === "landing_page") {
      return createContextAndRedirect({
        source: "landing_page",
        initial_intent: "creator",
        returnPath: "/dashboard",
      });
    }

    if (source === "claim_link") {
      if (!claimToken) return forwardToRegister();

      const admin = createAdminClient();
      const { data: link } = await admin
        .from("claim_links")
        .select(
          "id, ebook_id, status, max_uses, used_count, expires_at"
        )
        .eq("token", claimToken)
        .maybeSingle();

      if (!link || link.status === "revoked") return forwardToRegister();
      if (
        link.status === "expired" ||
        (link.expires_at &&
          new Date(link.expires_at).getTime() < Date.now())
      ) {
        return forwardToRegister();
      }
      if (
        link.max_uses != null &&
        (link.used_count ?? 0) >= link.max_uses
      ) {
        return forwardToRegister();
      }

      // Creator attribution comes from the publication, not the link row.
      const { data: ebook } = await admin
        .from("published_ebooks")
        .select("creator_id")
        .eq("id", link.ebook_id)
        .maybeSingle();
      if (!ebook) return forwardToRegister();

      return createContextAndRedirect({
        source: "claim_link",
        initial_intent: "reader",
        claimLink: {
          id: String(link.id),
          ebook_id: String(link.ebook_id),
          creator_id: String(ebook.creator_id),
        },
        returnPath: returnPath ?? `/claim/${claimToken}`,
      });
    }

    // Unknown source: safest default is landing behavior.
    return createContextAndRedirect({
      source: "landing_page",
      initial_intent: "creator",
      returnPath: "/dashboard",
    });
  } catch (err) {
    console.error("auth/start failed", err);
    return forwardToRegister();
  }
}

async function createContextAndRedirect({
  source,
  initial_intent,
  claimLink,
  returnPath,
}: {
  source: "landing_page" | "claim_link";
  initial_intent: "reader" | "creator";
  claimLink?: { id: string; ebook_id: string; creator_id: string };
  returnPath: string;
}): Promise<Response> {
  const admin = createAdminClient();
  const ctx = createSignupContextToken();

  const { error } = await admin.from("signup_contexts").insert({
    token_hash: ctx.token_hash,
    source,
    initial_intent,
    claim_link_id: claimLink?.id ?? null,
    ebook_id: claimLink?.ebook_id ?? null,
    source_creator_id: claimLink?.creator_id ?? null,
    return_path: returnPath,
    expires_at: signupContextExpiresAt(),
  });

  if (error) {
    console.error("signup context insert failed", error);
    return forwardToRegister();
  }

  return NextResponse.redirect(registerUrl(returnPath), {
    headers: {
      "Set-Cookie": buildSignupContextCookie(ctx.token, {
        domain: resolveAuthCookieDomain(),
      }),
    },
  });
}