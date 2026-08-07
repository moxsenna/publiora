/**
 * Canonical domain helpers.
 *
 * Publiora serves three hosts from one Next.js repository:
 *   marketing  -> publiora.biz.id       (landing / acquisition)
 *   app        -> app.publiora.biz.id   (creator work)
 *   reader     -> baca.publiora.biz.id  (claim / reader auth / library / reading)
 *
 * Distribution links (claim + read) must always target the reader domain.
 * Never build them from `window.location.origin`.
 */

export type PublioraDomain = "marketing" | "app" | "reader";

const ENV_KEYS: Record<PublioraDomain, string> = {
  marketing: "NEXT_PUBLIC_MARKETING_URL",
  app: "NEXT_PUBLIC_APP_URL",
  reader: "NEXT_PUBLIC_READER_URL",
};

const CANONICAL_URLS: Record<PublioraDomain, string> = {
  marketing: "https://publiora.biz.id",
  app: "https://app.publiora.biz.id",
  reader: "https://baca.publiora.biz.id",
};

const DEV_FALLBACK_URL = "http://localhost:3000";

function isProduction(): boolean {
  return process.env.NODE_ENV === "production";
}

function readEnv(name: string): string | undefined {
  return process.env[name] ?? undefined;
}

function trimTrailingSlash(value: string): string {
  return value.replace(/\/+$/, "");
}

function validateBaseUrl(value: string, domain: PublioraDomain): string {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error(`Invalid ${ENV_KEYS[domain]}: ${value}`);
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error(`Invalid ${ENV_KEYS[domain]}: ${value}`);
  }
  if (url.username || url.password) {
    throw new Error(`Invalid ${ENV_KEYS[domain]}: credentials not allowed`);
  }
  return trimTrailingSlash(url.toString().replace(/\/$/, ""));
}

export function resolveDomainUrl(domain: PublioraDomain): string {
  const configured = readEnv(ENV_KEYS[domain]);
  if (configured) {
    return validateBaseUrl(configured, domain);
  }
  if (isProduction()) {
    return CANONICAL_URLS[domain];
  }
  return DEV_FALLBACK_URL;
}

/**
 * Reject any path that could escape the base origin:
 * - absolute URL (`https://evil.com/path`)
 * - protocol-relative (`//evil.com/path`)
 * - backslash tricks (`/\\evil.com\path`)
 * - encoded double slashes that decode to a cross-origin prefix
 */
function assertSafePath(path: string, domain: PublioraDomain): string {
  if (path.length === 0 || path === "/") {
    return "/";
  }
  if (/\s/.test(path)) {
    throw new Error(`Invalid path for ${ENV_KEYS[domain]}: whitespace`);
  }
  if (path.includes("\\")) {
    throw new Error(`Unsafe path rejected for ${ENV_KEYS[domain]}`);
  }
  const base = resolveDomainUrl(domain);
  const baseUrl = new URL(`${base}/`);
  const joined = new URL(path, baseUrl);
  if (joined.origin !== baseUrl.origin && !(joined.origin === "null" && !joined.host)) {
    throw new Error(`Cross-origin path rejected for ${ENV_KEYS[domain]}`);
  }
  // A resolved pathname must stay relative to our own origin.
  if (joined.pathname.startsWith("//") || joined.pathname.includes("\\")) {
    throw new Error(`Unsafe path rejected for ${ENV_KEYS[domain]}`);
  }
  return joined.pathname === "/" ? "/" : `${joined.pathname}${joined.search}${joined.hash}`;
}

/**
 * Build a URL on the requested domain.
 * `path` may be `/foo/bar`, `foo/bar`, include query/hash. Empty -> root.
 */
export function buildDomainUrl(domain: PublioraDomain, path?: string): string {
  const base = resolveDomainUrl(domain);
  const safePath = assertSafePath(path ?? "/", domain);
  if (safePath === "/") {
    return base;
  }
  return `${base}${safePath}`;
}

export function buildMarketingUrl(path?: string): string {
  return buildDomainUrl("marketing", path);
}

export function buildAppUrl(path?: string): string {
  return buildDomainUrl("app", path);
}

export function buildReaderUrl(path?: string): string {
  return buildDomainUrl("reader", path);
}

export function buildClaimUrl(token: string): string {
  return buildReaderUrl(`/claim/${encodeURIComponent(token)}`);
}

export function buildPublishedReaderUrl(slug: string): string {
  return buildReaderUrl(`/read/${encodeURIComponent(slug)}`);
}

export function buildProjectPreviewUrl(projectId: string): string {
  return buildAppUrl(`/projects/${encodeURIComponent(projectId)}/preview`);
}

/** Reader-host claim token URL, alias used by distribution UI. */
export function buildPublicClaimUrl(token: string): string {
  return buildClaimUrl(token);
}