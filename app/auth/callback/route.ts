import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { EmailOtpType } from "@supabase/supabase-js";

function sanitizeNextUrl(next: string | null, origin: string): string {
  if (!next || typeof next !== "string") {
    return `${origin}/dashboard`;
  }
  // Safe relative paths start with single slash, not double slash (//evil.com)
  if (next.startsWith("/") && !next.startsWith("//")) {
    return `${origin}${next}`;
  }
  return `${origin}/dashboard`;
}

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const tokenHash = requestUrl.searchParams.get("token_hash");
  const type = requestUrl.searchParams.get("type");
  const next = requestUrl.searchParams.get("next");
  const origin = requestUrl.origin;

  const redirectTarget = sanitizeNextUrl(next, origin);

  try {
    const supabase = await createClient();

    if (code) {
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (error) {
        console.error("Auth callback code exchange failed:", error);
        return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`, { status: 303 });
      }
      return NextResponse.redirect(redirectTarget, { status: 303 });
    }

    if (tokenHash && type) {
      const { error } = await supabase.auth.verifyOtp({
        token_hash: tokenHash,
        type: type as EmailOtpType,
      });
      if (error) {
        console.error("Auth callback OTP verification failed:", error);
        return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`, { status: 303 });
      }
      return NextResponse.redirect(redirectTarget, { status: 303 });
    }

    return NextResponse.redirect(`${origin}/login`, { status: 303 });
  } catch (err) {
    console.error("Auth callback unexpected error:", err);
    return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`, { status: 303 });
  }
}
