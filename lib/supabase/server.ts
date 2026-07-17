import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

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

export async function createClient() {
  const { url, anonKey } = getPublicSupabaseEnv();
  const cookieStore = await cookies();

  return createServerClient(url, anonKey, {
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
          // set from Server Component — middleware/proxy refreshes session
        }
      },
    },
  });
}
