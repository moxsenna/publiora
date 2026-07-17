import { createBrowserClient } from "@supabase/ssr";

function getPublicSupabaseEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY");
  }
  if (url.includes("your-project-ref") || anonKey.includes("your-anon-key")) {
    throw new Error("Supabase env still uses placeholder values");
  }
  return { url, anonKey };
}

export function createClient() {
  const { url, anonKey } = getPublicSupabaseEnv();
  return createBrowserClient(url, anonKey);
}

export function hasSupabaseEnv(): boolean {
  try {
    getPublicSupabaseEnv();
    return true;
  } catch {
    return false;
  }
}
