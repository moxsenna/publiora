import { describe, expect, it } from "vitest";
import {
  createSignupContextToken,
  generateSignupContextToken,
  hashSignupContextToken,
  signupContextExpiresAt,
  buildSignupContextCookie,
  buildSignupContextClearCookie,
  SIGNUP_CONTEXT_COOKIE,
  SIGNUP_CONTEXT_TTL_MS,
} from "@/lib/auth/signup-context";

describe("signup context token", () => {
  it("generates ≥32-byte base64url tokens", () => {
    const token = generateSignupContextToken();
    expect(Buffer.from(token, "base64url").length).toBeGreaterThanOrEqual(32);
    expect(token).not.toMatch(/[+/=]/);
  });

  it("is random per call", () => {
    expect(generateSignupContextToken()).not.toBe(
      generateSignupContextToken()
    );
  });

  it("hashes deterministically to SHA-256 hex", () => {
    const a = createSignupContextToken();
    const b = createSignupContextToken();
    expect(a.token_hash).toMatch(/^[0-9a-f]{64}$/);
    expect(hashSignupContextToken(a.token)).toBe(a.token_hash);
    expect(a.token_hash).not.toBe(b.token_hash);
  });

  it("never stores the raw token in the hash", () => {
    const { token, token_hash } = createSignupContextToken();
    expect(token_hash).not.toContain(token);
  });
});

describe("expiry", () => {
  it("is two hours ahead", () => {
    const now = Date.parse("2026-08-07T00:00:00Z");
    expect(signupContextExpiresAt(now)).toBe(
      new Date(now + SIGNUP_CONTEXT_TTL_MS).toISOString()
    );
  });
});

describe("cookie serialization", () => {
  it("marks the cookie HttpOnly with two-hour Max-Age", () => {
    const cookie = buildSignupContextCookie("TOKEN123");
    expect(cookie).toContain(`${SIGNUP_CONTEXT_COOKIE}=TOKEN123`);
    expect(cookie).toContain("HttpOnly");
    expect(cookie).toContain("Max-Age=7200");
    expect(cookie).toContain("SameSite=Lax");
  });

  it("applies domain and secure flags", () => {
    const cookie = buildSignupContextCookie("T", {
      domain: ".publiora.biz.id",
      secure: true,
    });
    expect(cookie).toContain("Domain=.publiora.biz.id");
    expect(cookie).toContain("Secure");
  });

  it("clear cookie expires immediately", () => {
    const cookie = buildSignupContextClearCookie();
    expect(cookie).toContain(`${SIGNUP_CONTEXT_COOKIE}=`);
    expect(cookie).toContain("Max-Age=0");
  });
});