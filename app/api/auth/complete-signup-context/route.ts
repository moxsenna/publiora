import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { resolveAuthCookieDomain } from "@/lib/supabase/cookie-options";
import {
  SIGNUP_CONTEXT_COOKIE,
  hashSignupContextToken,
  buildSignupContextClearCookie,
} from "@/lib/auth/signup-context";
import { jsonError } from "@/lib/api/errors";
import { getSupabaseErrorMessage } from "@/lib/api/supabase-result";
import type { Profile } from "@/types/auth";

// Finalize immutable signup attribution after a successful session.
// Reads the one-time context cookie, hashes the token, calls
// complete_signup_context_v1, clears the cookie, and returns the profile.
// Idempotent: a missing/expired/consumed context simply clears the cookie.
export async function POST(req: Request) {
  try {
    const rawToken = readSignupContextCookie(req);
    const bodyRaw = await req.json().catch(() => null);
    const consent = Boolean(
      bodyRaw && typeof bodyRaw === "object"
        ? (bodyRaw as { marketing_email_consent?: unknown })
            .marketing_email_consent
        : false
    );

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return jsonError("Unauthorized", 401, "unauthorized");

    const tokenHash = rawToken
      ? hashSignupContextToken(rawToken)
      : null;

    const { data: profile, error } = await supabase.rpc(
      "complete_signup_context_v1",
      {
        p_token_hash: tokenHash,
        p_marketing_email_consent: consent,
      }
    );

    if (error) {
      return jsonError(
        getSupabaseErrorMessage(error, "Gagal menyimpan informasi pendaftaran"),
        500,
        "db_error"
      );
    }

    return NextResponse.json(
      { profile: profile as Profile },
      {
        headers: {
          "Set-Cookie": buildSignupContextClearCookie({
            domain: resolveAuthCookieDomain(),
          }),
        },
      }
    );
  } catch (err) {
    console.error("complete-signup-context failed", err);
    return jsonError(
      "Layanan registrasi sementara tidak tersedia.",
      503,
      "unavailable"
    );
  }
}

function readSignupContextCookie(req: Request): string | null {
  const cookieHeader = req.headers.get("cookie");
  if (!cookieHeader) return null;
  const match = cookieHeader.match(
    new RegExp(`(?:^|;\\s*)${SIGNUP_CONTEXT_COOKIE}=([^;]+)`)
  );
  if (!match) return null;
  try {
    return decodeURIComponent(match[1]);
  } catch {
    return null;
  }
}