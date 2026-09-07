import { createBrowserClient } from "@supabase/ssr";
import { getPublicSupabaseEnv } from "@/lib/supabase/env";
import { normalizeAuthCookieOptions } from "@/lib/supabase/cookie-options";

export function createClient() {
  const env = getPublicSupabaseEnv();
  if (!env) throw new Error("Supabase public env unavailable");
  return createBrowserClient(env.url, env.key, {
    cookies: {
      getAll() {
        return parseDocumentCookies(document.cookie);
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          const normalized = normalizeAuthCookieOptions(options);
          document.cookie = `${name}=${value}${serializeOptions(normalized)}`;
        });
      },
    },
  });
}

export function parseDocumentCookies(raw: string): { name: string; value: string }[] {
  return raw.split(";").reduce<{ name: string; value: string }[]>((acc, part) => {
    const eq = part.indexOf("=");
    if (eq === -1) return acc;
    const name = part.slice(0, eq).trim();
    const value = part.slice(eq + 1).trim();
    if (name) acc.push({ name, value });
    return acc;
  }, []);
}

function serializeOptions(options: {
  domain?: string;
  path?: string;
  maxAge?: number;
  expires?: Date;
  secure?: boolean;
  sameSite?: boolean | "lax" | "strict" | "none";
}): string {
  const parts: string[] = [];
  if (options.path) parts.push(`Path=${options.path}`);
  if (options.domain) parts.push(`Domain=${options.domain}`);
  if (typeof options.maxAge === "number") parts.push(`Max-Age=${options.maxAge}`);
  if (options.expires) parts.push(`Expires=${options.expires.toUTCString()}`);
  if (options.secure) parts.push("Secure");
  if (options.sameSite) parts.push(`SameSite=${options.sameSite}`);
  return parts.length ? `; ${parts.join("; ")}` : "";
}

export function hasSupabaseEnv(): boolean {
  try {
    return getPublicSupabaseEnv() != null;
  } catch {
    return false;
  }
}