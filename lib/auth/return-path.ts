/**
 * Validate post-signup return paths for signup contexts.
 *
 * Only claim-journey paths are approved: `/claim/:token`.
 * Everything else (external URLs, absolute host paths, backslashes,
 * encoded double slashes, unknown routes) is rejected — the auth/start
 * route never redirects user-controlled URLs.
 */

const CLAIM_PREFIX = "/claim/";

function decodeSafely(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

/** Normalize an incoming token for matching against claim_links.token. */
export function normalizeClaimToken(raw: string): string {
  return raw.trim().toUpperCase();
}

/**
 * Approve a return path for the claim journey.
 * Accepts only `/claim/<TOKEN>` with a well-formed token segment.
 */
export function approveClaimReturnPath(
  rawPath: string | undefined | null,
  expectedToken: string | undefined | null,
): string | null {
  if (!rawPath || typeof rawPath !== "string") return null;
  if (rawPath.includes("\\")) return null;

  const decoded = decodeSafely(rawPath);
  if (decoded !== rawPath) return null; // no percent-encoding tricks

  // Must start with exactly /claim/ and have a non-empty token segment.
  if (!rawPath.startsWith(CLAIM_PREFIX)) return null;
  const tokenPart = rawPath.slice(CLAIM_PREFIX.length);
  if (!tokenPart || tokenPart.includes("/") || tokenPart.includes("?")) {
    return null;
  }
  const normalized = normalizeClaimToken(tokenPart);
  if (!/^[A-Z0-9]+$/.test(normalized)) return null;

  // When a current token is supplied, the return path must match it exactly.
  if (expectedToken && normalized !== normalizeClaimToken(expectedToken)) {
    return null;
  }

  return `${CLAIM_PREFIX}${normalized}`;
}

/**
 * Approve a post-auth redirect target for register/login pages.
 * Accepts only the claim journey (`/claim/:token`) and `/dashboard`;
 * everything else falls back to `/dashboard` (no open redirects).
 */
export function approveSignupReturnPath(
  rawPath: string | undefined | null,
): string {
  if (!rawPath || typeof rawPath !== "string") return "/dashboard";
  if (rawPath === "/dashboard") return "/dashboard";
  const claim = approveClaimReturnPath(rawPath, null);
  return claim ?? "/dashboard";
}

/** Append a non-default return path to an auth switch href. */
export function withSignupReturnPath(base: string, returnPath: string): string {
  return returnPath && returnPath !== "/dashboard"
    ? `${base}?return_to=${encodeURIComponent(returnPath)}`
    : base;
}

/**
 * Build the `/auth/start` entry URL for registration so signups always create
 * a fresh validated signup context instead of hitting /register directly.
 * Claim paths carry the claim metadata; everything else is a landing funnel.
 */
export function signupEntryUrl(returnPath: string): string {
  if (returnPath && returnPath !== "/dashboard") {
    const claim = approveClaimReturnPath(returnPath, null);
    if (claim) {
      const token = claim.slice(CLAIM_PREFIX.length);
      return `/auth/start?source=claim_link&claim_token=${encodeURIComponent(token)}&return_to=${encodeURIComponent(claim)}`;
    }
  }
  return "/auth/start?source=landing_page";
}