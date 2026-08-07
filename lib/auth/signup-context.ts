/**
 * Short-lived signup contexts: one-time attribution carrier from a
 * marketing or claim entry point into the registration funnel.
 *
 * Security rules:
 * - only the SHA-256 hash of the token is stored in signup_contexts;
 * - the raw token travels only in an HttpOnly cookie;
 * - context expires after two hours and is consumed once;
 * - the landing path only records intent, the claim path records the
 *   claim + ebook + creator references for immutable attribution.
 */

import { createHash, randomBytes } from "node:crypto";

export const SIGNUP_CONTEXT_COOKIE = "publiora_signup_context";
export const SIGNUP_CONTEXT_TTL_MS = 2 * 60 * 60 * 1000; // two hours

export type SignupContextSource = "landing_page" | "claim_link";
export type SignupContextIntent = "reader" | "creator";

export interface SignupContextInput {
  source: SignupContextSource;
  initial_intent: SignupContextIntent;
  return_path: string | null;
  claim_link_id?: string | null;
  ebook_id?: string | null;
  source_creator_id?: string | null;
}

export interface SignupContext {
  token: string;
  /** SHA-256 hex of the token — the only value persisted. */
  token_hash: string;
}

/** Cryptographically random token: ≥32 bytes, base64url, no padding. */
export function generateSignupContextToken(): string {
  return randomBytes(32).toString("base64url");
}

/** SHA-256 hex digest — call with the raw token, never log the raw value. */
export function hashSignupContextToken(token: string): string {
  return createHash("sha256").update(token, "utf8").digest("hex");
}

/** Build a fresh context pair (raw token + stored hash). */
export function createSignupContextToken(): SignupContext {
  const token = generateSignupContextToken();
  return { token, token_hash: hashSignupContextToken(token) };
}

export function signupContextExpiresAt(now: number = Date.now()): string {
  return new Date(now + SIGNUP_CONTEXT_TTL_MS).toISOString();
}

/**
 * SignupContext extraction input from a signup granted by cookie-options.
 * Kept generic so it works for both route-handler and middleware writes.
 */
export interface SignupContextCookieAttributes {
  domain?: string | null;
  path?: string;
  secure?: boolean;
  sameSite?: "lax" | "strict" | "none";
}

/** Serialize the one-time context cookie (raw token, HttpOnly). */
export function buildSignupContextCookie(
  token: string,
  attrs: SignupContextCookieAttributes = {},
): string {
  const parts = [
    `${SIGNUP_CONTEXT_COOKIE}=${encodeURIComponent(token)}`,
    "HttpOnly",
    "Path=/",
    `Max-Age=${SIGNUP_CONTEXT_TTL_MS / 1000}`,
  ];
  if (attrs.domain) parts.push(`Domain=${attrs.domain}`);
  if (attrs.secure ?? true) parts.push("Secure");
  parts.push(`SameSite=${attrs.sameSite ?? "Lax"}`);
  return parts.join("; ");
}

/** Cookie that clears the one-time context (Max-Age=0). */
export function buildSignupContextClearCookie(
  attrs: SignupContextCookieAttributes = {},
): string {
  const parts = [
    `${SIGNUP_CONTEXT_COOKIE}=`,
    "HttpOnly",
    "Path=/",
    "Max-Age=0",
  ];
  if (attrs.domain) parts.push(`Domain=${attrs.domain}`);
  if (attrs.secure ?? true) parts.push("Secure");
  parts.push(`SameSite=${attrs.sameSite ?? "Lax"}`);
  return parts.join("; ");
}