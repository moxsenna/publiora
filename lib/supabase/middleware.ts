import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";
import { getPublicSupabaseEnv } from "@/lib/supabase/env";

/** Build request-scoped Supabase client that can write refreshed cookies. */
export function createClient(request: NextRequest) {
  let response = NextResponse.next({
    request: { headers: request.headers },
  });

  const env = getPublicSupabaseEnv({ soft: true });
  if (!env) {
    return { supabase: null as null, response };
  }

  const supabase = createServerClient(env.url, env.key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options)
        );
      },
    },
  });

  return { supabase, response };
}

/** Refresh auth session cookies for matched routes. No-op when env missing. */
export async function updateSession(request: NextRequest) {
  const { supabase, response } = createClient(request);
  if (!supabase) return response;

  await supabase.auth.getUser();
  return response;
}
