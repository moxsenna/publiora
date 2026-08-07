import { describe, expect, it } from "vitest";
import {
  approveClaimReturnPath,
  approveSignupReturnPath,
  normalizeClaimToken,
  signupEntryUrl,
  withSignupReturnPath,
} from "@/lib/auth/return-path";

describe("normalizeClaimToken", () => {
  it("uppercases and trims raw tokens", () => {
    expect(normalizeClaimToken("  abc123  ")).toBe("ABC123");
  });
});

describe("approveClaimReturnPath", () => {
  it("accepts a claim path matching the current token", () => {
    expect(approveClaimReturnPath("/claim/ABC123", "abc123")).toBe(
      "/claim/ABC123"
    );
  });

  it("accepts a claim path with no expected token", () => {
    expect(approveClaimReturnPath("/claim/ABC123", null)).toBe("/claim/ABC123");
  });

  it("rejects external URLs", () => {
    expect(approveClaimReturnPath("https://evil.com/claim/X", "X")).toBeNull();
    expect(approveClaimReturnPath("//evil.com/claim/X", "X")).toBeNull();
  });

  it("rejects backslash paths", () => {
    expect(approveClaimReturnPath("/claim\\evil", "X")).toBeNull();
  });

  it("rejects encoded double slashes", () => {
    expect(approveClaimReturnPath("/claim/%2F%2Fevil.com", "X")).toBeNull();
  });

  it("rejects encoded segments", () => {
    expect(approveClaimReturnPath("/claim/%41BC", "ABC")).toBeNull();
  });

  it("rejects unapproved paths", () => {
    expect(approveClaimReturnPath("/dashboard", null)).toBeNull();
    expect(approveClaimReturnPath("/read/abc", null)).toBeNull();
    expect(approveClaimReturnPath("/claim/ABC/extra", "ABC")).toBeNull();
    expect(approveClaimReturnPath("/claim/", null)).toBeNull();
  });

  it("rejects a token mismatch", () => {
    expect(approveClaimReturnPath("/claim/ABCDEF", "XYZ")).toBeNull();
  });

  it("rejects non-alphanumeric token segments", () => {
    expect(approveClaimReturnPath("/claim/AB!C", null)).toBeNull();
  });

  it("rejects empty or missing input", () => {
    expect(approveClaimReturnPath(null, null)).toBeNull();
    expect(approveClaimReturnPath("", null)).toBeNull();
    expect(approveClaimReturnPath(undefined, null)).toBeNull();
  });
});

describe("approveSignupReturnPath", () => {
  it("accepts the dashboard and claim paths", () => {
    expect(approveSignupReturnPath("/dashboard")).toBe("/dashboard");
    expect(approveSignupReturnPath("/claim/ABC123")).toBe("/claim/ABC123");
  });

  it("falls back to dashboard for missing input", () => {
    expect(approveSignupReturnPath(null)).toBe("/dashboard");
    expect(approveSignupReturnPath(undefined)).toBe("/dashboard");
    expect(approveSignupReturnPath("")).toBe("/dashboard");
  });

  it("never allows open redirects", () => {
    expect(approveSignupReturnPath("https://evil.com/")).toBe("/dashboard");
    expect(approveSignupReturnPath("//evil.com/claim/X")).toBe("/dashboard");
    expect(approveSignupReturnPath("/claim\\evil")).toBe("/dashboard");
    expect(approveSignupReturnPath("/read/abc")).toBe("/dashboard");
    expect(approveSignupReturnPath("/claim/%2F%2Fevil.com")).toBe("/dashboard");
    expect(approveSignupReturnPath("/claim/AB!C")).toBe("/dashboard");
  });
});

describe("withSignupReturnPath", () => {
  it("appends only non-dashboard return paths", () => {
    expect(withSignupReturnPath("/login", "/dashboard")).toBe("/login");
    expect(withSignupReturnPath("/login", "/claim/ABC123")).toBe(
      "/login?return_to=%2Fclaim%2FABC123"
    );
    expect(withSignupReturnPath("/register", "")).toBe("/register");
  });
});

describe("signupEntryUrl", () => {
  it("routes claim returns through claim_link auth/start", () => {
    expect(signupEntryUrl("/claim/ABC123")).toBe(
      "/auth/start?source=claim_link&claim_token=ABC123&return_to=%2Fclaim%2FABC123"
    );
  });

  it("routes non-claim returns through the landing funnel", () => {
    expect(signupEntryUrl("/dashboard")).toBe("/auth/start?source=landing_page");
    expect(signupEntryUrl("")).toBe("/auth/start?source=landing_page");
  });

  it("never echoes a rejected return value into the entry url", () => {
    expect(signupEntryUrl("https://evil.com/x")).toBe(
      "/auth/start?source=landing_page"
    );
  });
});