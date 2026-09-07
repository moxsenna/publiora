import { createClient } from "@/lib/supabase/server";
import { jsonError } from "@/lib/api/errors";

/**
 * Marketing email consent preference (settings toggle).
 *
 * Only the consent fields are writable here. Signup origin and lifecycle
 * timestamps are immutable and are never touched by this route.
 */
export async function PATCH(req: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return jsonError("Unauthorized", 401, "unauthorized");

    const body = (await req.json().catch(() => null)) as {
      marketing_email_consent?: unknown;
    } | null;
    if (!body || typeof body.marketing_email_consent !== "boolean") {
      return jsonError(
        "marketing_email_consent boolean required",
        400,
        "validation_error"
      );
    }

    const now = new Date().toISOString();
    const { data, error } = await supabase
      .from("profiles")
      .update({
        marketing_email_consent: body.marketing_email_consent,
        marketing_email_consent_at: now,
        marketing_email_consent_source: "account_settings",
        updated_at: now,
      })
      .eq("id", user.id)
      .select(
        "marketing_email_consent, marketing_email_consent_at, marketing_email_consent_source"
      )
      .maybeSingle();

    if (error) return jsonError(error.message, 500, "db_error");

    return Response.json({ ok: true, profile: data });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Server error";
    return jsonError(message, 503, "unavailable");
  }
}