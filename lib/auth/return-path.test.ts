import { describe, expect, it } from "vitest";
import {
  approveClaimReturnPath,
  normalizeClaimToken,
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