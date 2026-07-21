import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

/**
 * Next 16: middleware renamed to proxy.
 * Refresh Supabase session cookies on auth-related app routes.
 */
export async function proxy(request: NextRequest) {
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
    "/login",
    "/register",
  ],
};
