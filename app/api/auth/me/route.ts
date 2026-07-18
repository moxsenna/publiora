import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/types/auth";
import type { PlanId } from "@/types/billing";

function isPlanId(value: unknown): value is PlanId {
  return value === "free" || value === "creator" || value === "pro";
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
