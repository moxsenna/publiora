import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";

function getPublicSupabaseEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) return null;
  if (url.includes("your-project-ref") || anonKey.includes("your-anon-key")) {
    return null;
  }
  return { url, anonKey };
}

/** Build request-scoped Supabase client that can write refreshed cookies. */
export function createClient(request: NextRequest) {
  let response = NextResponse.next({
    request: { headers: request.headers },
  });

  const env = getPublicSupabaseEnv();
  if (!env) {
    return { supabase: null, response };
  }

  const supabase = createServerClient(env.url, env.anonKey, {
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

  // Touch session so expired tokens refresh into cookies
  await supabase.auth.getUser();
  return response;
}
