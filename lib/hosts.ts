/**
 * Product host boundaries.
 *
 * Publiora is served from three hosts backed by the same Next.js build:
 *   marketing  -> publiora.biz.id
 *   app        -> app.publiora.biz.id
 *   reader     -> baca.publiora.biz.id
 *
 * A request landing on the "wrong" host for its route is redirected to the
 * canonical host with the same path + search string preserved.
 *
 * Boundaries are enforced only on canonical hosts or when explicitly enabled;
 * unknown hosts (localhost, preview domains) never redirect, so local
 * development cannot loop.
 */

import { buildAppUrl, buildReaderUrl } from "./urls";

export type HostKind = "marketing" | "app" | "reader" | "unknown";
export type RouteKind = "marketing" | "app" | "reader";

/** Reader-owned routes — served only on baca host. */
export const READER_ROUTE_PREFIXES = ["/claim", "/read", "/library"] as const;

/** Creator-owned routes — served only on app host. */
export const APP_ROUTE_PREFIXES = [
  "/dashboard",
  "/projects",
  "/offers",
  "/published",
  "/settings",
  "/billing",
] as const;

/** Marketing-owned routes — served only on publiora host. */
export const MARKETING_ROUTE_PREFIXES = [
  "/legal",
  "/privacy",
  "/terms",
  "/terms-of-service",
] as const;

/** Auth routes shared by app + reader hosts (never redirected between them). */
const SHARED_AUTH_PREFIXES = ["/login", "/register", "/auth/start"] as const;

const CANONICAL_HOSTS: Record<Exclude<HostKind, "unknown">, string> = {
  marketing: "publiora.biz.id",
  app: "app.publiora.biz.id",
  reader: "baca.publiora.biz.id",
};

function matchesHost(host: string, canonical: string): boolean {
  return host === canonical || host.endsWith(`.${canonical}`);
}

/** Classify an incoming Host header. Unknown hosts are never redirected. */
export function detectHostKind(host: string | undefined): HostKind {
  if (!host) return "unknown";
  const normalized = host.toLowerCase().split(":")[0];
  if (matchesHost(normalized, CANONICAL_HOSTS.app)) return "app";
  if (matchesHost(normalized, CANONICAL_HOSTS.reader)) return "reader";
  if (matchesHost(normalized, CANONICAL_HOSTS.marketing)) return "marketing";
  return "unknown";
}

function prefixMatch(prefixes: readonly string[], pathname: string): boolean {
  return prefixes.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

/** Which product zone owns this pathname? Shared auth routes return null. */
export function zoneOf(pathname: string): RouteKind | null {
  if (prefixMatch(READER_ROUTE_PREFIXES, pathname)) return "reader";
  if (prefixMatch(APP_ROUTE_PREFIXES, pathname)) return "app";
  if (prefixMatch(MARKETING_ROUTE_PREFIXES, pathname)) return "marketing";
  return null;
}

export function isSharedAuthRoute(pathname: string): boolean {
  return prefixMatch(SHARED_AUTH_PREFIXES, pathname);
}

function buildZoneUrl(zone: RouteKind, pathname: string, search: string): string {
  const location = `${pathname}${search}`;
  return zone === "reader" ? buildReaderUrl(location) : buildAppUrl(location);
}

export function isHostBoundaryEnforcementEnabled(
  nodeEnv: string | undefined = process.env.NODE_ENV,
  flag: string | undefined = process.env.NEXT_PUBLIC_ENFORCE_HOST_BOUNDARIES,
): boolean {
  if (flag === "true" || flag === "1") return true;
  if (flag === "false" || flag === "0") return false;
  return nodeEnv === "production";
}

/**
 * Decide a canonical-host redirect for the request, or null when the request
 * stays where it belongs (or the host is unknown).
 */
export function resolveHostBoundary(
  host: string | undefined,
  pathname: string,
  search: string,
  enabled: boolean = isHostBoundaryEnforcementEnabled(),
): string | null {
  if (!enabled) return null;
  const hostKind = detectHostKind(host);
  if (hostKind === "unknown") return null;

  // Marketing/legal content and marketing-side /auth/start stay on marketing.
  // Plain /login + /register on the marketing host land on the app register flow.
  if (isSharedAuthRoute(pathname)) {
    if (hostKind === "marketing" && pathname !== "/auth/start") {
      return buildAppUrl(`${pathname}${search}`);
    }
    return null;
  }

  const zone = zoneOf(pathname);
  if (!zone || zone === "marketing") return null;
  if (zone === hostKind) return null;
  return buildZoneUrl(zone, pathname, search);
}