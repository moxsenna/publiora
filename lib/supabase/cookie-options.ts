/**
 * Shared session across subdomains.
 *
 * Publiora runs the same build on app.publiora.biz.id and
 * baca.publiora.biz.id. For a session created on one host to be recognized
 * on the other, Supabase auth cookies must be scoped to the parent domain
 * (.publiora.biz.id).
 *
 * Cookie policy (production):
 *   Domain=.publiora.biz.id
 *   Path=/
 *   Secure=true
 *   SameSite=Lax
 *
 * Local development omits the Domain attribute so cookies stay on localhost.
 */

export const DEFAULT_AUTH_COOKIE_DOMAIN = ".publiora.biz.id";

export type AuthCookieRole = "browser" | "server";

/**
 * Resolve the cookie Domain attribute:
 * - explicit AUTH_COOKIE_DOMAIN / NEXT_PUBLIC_AUTH_COOKIE_DOMAIN wins;
 * - production falls back to `.publiora.biz.id`;
 * - anything else (dev, tests) returns null (domain omitted).
 */
export function resolveAuthCookieDomain(
  nodeEnv: string | undefined = process.env.NODE_ENV,
  configured:
    | string
    | undefined = process.env.AUTH_COOKIE_DOMAIN ??
    process.env.NEXT_PUBLIC_AUTH_COOKIE_DOMAIN,
): string | null {
  const value = configured?.trim();
  if (value) return value;
  return nodeEnv === "production" ? DEFAULT_AUTH_COOKIE_DOMAIN : null;
}

/** Cookie attributes compatible with Supabase auth cookie writes. */
export interface SupabaseCookieOptions {
  domain?: string;
  path?: string;
  maxAge?: number;
  expires?: Date;
  httpOnly?: boolean;
  secure?: boolean;
  sameSite?: boolean | "lax" | "strict" | "none";
}

/** Apply the shared parent-domain attribute, preserving everything else. */
export function normalizeAuthCookieOptions(
  options: SupabaseCookieOptions | undefined,
  domain: string | null = resolveAuthCookieDomain(),
): SupabaseCookieOptions {
  if (!domain) return options ?? {};
  return { ...(options ?? {}), domain };
}

/** Browser-side cookie options (document.cookie writes). */
export function getBrowserAuthCookieOptions(domain = resolveAuthCookieDomain()) {
  return domain ? { domain } as const : ({} as const);
}

/** Server-side cookie options (cookies() / middleware responses). */
export function getServerAuthCookieOptions(domain = resolveAuthCookieDomain()) {
  return domain ? { domain } as const : ({} as const);
}