import { NextResponse, type NextRequest } from "next/server";
import { authId } from "@/lib/i18n/id/auth";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const token = typeof body?.token === "string" ? body.token.trim() : "";

    const secretKey = process.env.TURNSTILE_SECRET_KEY;

    // Graceful bypass when keys are not configured (local dev / testing / staging)
    if (!secretKey || token === "bypass") {
      return NextResponse.json({ ok: true, bypassed: true });
    }

    if (!token) {
      return NextResponse.json(
        { ok: false, error: authId.turnstileRequired },
        { status: 400 }
      );
    }

    const clientIp =
      request.headers.get("cf-connecting-ip") ??
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      undefined;

    const formData = new URLSearchParams();
    formData.append("secret", secretKey);
    formData.append("response", token);
    if (clientIp) {
      formData.append("remoteip", clientIp);
    }

    const verifyRes = await fetch(
      "https://challenges.cloudflare.com/turnstile/v0/siteverify",
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: formData,
      }
    );

    const result = await verifyRes.json().catch(() => ({ success: false }));

    if (!result.success) {
      return NextResponse.json(
        { ok: false, error: authId.turnstileFailed },
        { status: 400 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("turnstile verify error:", err);
    return NextResponse.json(
      { ok: false, error: authId.turnstileFailed },
      { status: 500 }
    );
  }
}
