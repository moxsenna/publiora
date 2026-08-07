import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";
import { resolveHostBoundary } from "@/lib/hosts";

/**
 * Next 16: middleware renamed to proxy.
 * 1. Enforce product host boundaries (see lib/hosts.ts) — canonical-host
 *    redirects happen before any session work so we never touch the DB for
 *    requests we are about to send elsewhere.
 * 2. Refresh Supabase session cookies on auth-related app routes.
 */
export async function proxy(request: NextRequest) {
  const boundary = resolveHostBoundary(
    request.headers.get("host") ?? undefined,
    request.nextUrl.pathname,
    request.nextUrl.search,
  );
  if (boundary) {
    return NextResponse.redirect(boundary, { status: 308 });
  }
  return updateSession(request);
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/projects/:path*",
    "/offers",
    "/offers/:path*",
    "/library/:path*",
    "/settings/:path*",
    "/published/:path*",
    "/billing/:path*",
    "/login",
    "/register",
    "/claim/:path*",
    "/read/:path*",
  ],
};