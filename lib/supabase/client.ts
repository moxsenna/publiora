import { createBrowserClient } from "@supabase/ssr";
import { getPublicSupabaseEnv } from "@/lib/supabase/env";

export function createClient() {
  const env = getPublicSupabaseEnv();
  if (!env) throw new Error("Supabase public env unavailable");
  return createBrowserClient(env.url, env.key);
}

export function hasSupabaseEnv(): boolean {
  try {
    return getPublicSupabaseEnv() != null;
  } catch {
    return false;
  }
}
