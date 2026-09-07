import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { Profile, SignupOrigin, MarketingConsentSource } from "@/types/auth";
import type { PlanId } from "@/types/billing";

function isPlanId(value: unknown): value is PlanId {
  return value === "free" || value === "creator" || value === "pro";
}

function isSignupOrigin(value: unknown): value is SignupOrigin {
  return (
    value === "unattributed" ||
    value === "landing_page" ||
    value === "claim_link" ||
    value === "direct_app" ||
    value === "legacy_unknown" ||
    value === "admin_created"
  );
}

function isConsentSource(value: unknown): value is MarketingConsentSource {
  return (
    value === "landing_signup" ||
    value === "claim_signup" ||
    value === "account_settings" ||
    value === "admin_import"
  );
}

function mapProfileRow(row: Record<string, unknown>, email: string | null): Profile {
  const planRaw = row.plan_id ?? row.plan;
  return {
    id: String(row.id),
    name: (row.name as string | null) ?? null,
    email: (row.email as string | null) ?? email,
    avatar_url: (row.avatar_url as string | null) ?? null,
    role: row.role === "admin" ? "admin" : "user",
    plan: isPlanId(planRaw) ? planRaw : "free",
    created_at: String(row.created_at ?? new Date().toISOString()),
    updated_at: String(row.updated_at ?? new Date().toISOString()),
    signup_origin: isSignupOrigin(row.signup_origin)
      ? row.signup_origin
      : "unattributed",
    initial_intent:
      row.initial_intent === "reader" || row.initial_intent === "creator"
        ? row.initial_intent
        : null,
    first_claim_link_id: (row.first_claim_link_id as string | null) ?? null,
    first_claim_ebook_id: (row.first_claim_ebook_id as string | null) ?? null,
    first_claim_creator_id: (row.first_claim_creator_id as string | null) ?? null,
    reader_activated_at: (row.reader_activated_at as string | null) ?? null,
    creator_activated_at: (row.creator_activated_at as string | null) ?? null,
    creator_subscribed_at: (row.creator_subscribed_at as string | null) ?? null,
    marketing_email_consent: Boolean(row.marketing_email_consent ?? false),
    marketing_email_consent_at: (row.marketing_email_consent_at as string | null) ?? null,
    marketing_email_consent_source: isConsentSource(row.marketing_email_consent_source)
      ? row.marketing_email_consent_source
      : null,
  };
}

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: row, error: profileError } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .maybeSingle();

    let profile: Profile;
    if (profileError || !row) {
      const meta = user.user_metadata ?? {};
      const now = new Date().toISOString();
      profile = {
        id: user.id,
        name:
          (typeof meta.name === "string" && meta.name) ||
          (typeof meta.full_name === "string" && meta.full_name) ||
          (user.email ? user.email.split("@")[0] : null),
        email: user.email ?? null,
        avatar_url: typeof meta.avatar_url === "string" ? meta.avatar_url : null,
        role: "user",
        plan: "free",
        created_at: now,
        updated_at: now,
        signup_origin: "unattributed",
        initial_intent: null,
        first_claim_link_id: null,
        first_claim_ebook_id: null,
        first_claim_creator_id: null,
        reader_activated_at: null,
        creator_activated_at: null,
        creator_subscribed_at: null,
        marketing_email_consent: false,
        marketing_email_consent_at: null,
        marketing_email_consent_source: null,
      };
    } else {
      profile = mapProfileRow(row as Record<string, unknown>, user.email ?? null);
    }

    return NextResponse.json({
      user: { id: user.id, email: user.email ?? null },
      profile,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Auth unavailable";
    return NextResponse.json({ error: message }, { status: 503 });
  }
}
