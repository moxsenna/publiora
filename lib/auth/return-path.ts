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