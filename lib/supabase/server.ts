import { createServerClient } from "@supabase/ssr";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { cookies, headers } from "next/headers";
import { getPublicSupabaseEnv } from "@/lib/supabase/env";

export async function createClient() {
  const env = getPublicSupabaseEnv();
  if (!env) throw new Error("Supabase public env unavailable");

  const headerStore = await headers();
  const auth = headerStore.get("authorization") || headerStore.get("Authorization");
  const bearer = auth?.toLowerCase().startsWith("bearer ")
    ? auth.slice(7).trim()
    : null;

  // E2E / API clients may pass Authorization: Bearer <access_token>
  if (bearer) {
    return createSupabaseClient(env.url, env.key, {
      global: { headers: { Authorization: `Bearer ${bearer}` } },
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }

  const cookieStore = await cookies();
  return createServerClient(env.url, env.key, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        } catch {
          // set from Server Component — proxy refreshes session
        }
      },
    },
  });
}
