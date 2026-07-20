import { describe, expect, it } from "vitest";
import {
  createOfferSchema,
  patchOfferSchema,
  quickCreateOfferSchema,
} from "./schemas";

describe("offer schemas", () => {
  it("accepts full valid create", () => {
    const parsed = createOfferSchema.safeParse({
      name: "Growth Audit untuk SaaS",
      offer_type: "service",
      ownership: "owned",
      short_description: "Audit growth funnel",
      target_audience: "Founder SaaS",
      primary_problem: "Growth stuck",
      primary_outcome: "Find bottlenecks",
      niche: "SaaS B2B",
      destination_url: "https://example.com/audit",
    });
    expect(parsed.success).toBe(true);
  });

  it("accepts quick create minimal", () => {
    const parsed = quickCreateOfferSchema.safeParse({
      name: "Kelas TikTok",
      offer_type: "course",
      ownership: "owned",
    });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.destination_url).toBeNull();
    }
  });

  it("rejects invalid URL", () => {
    const parsed = createOfferSchema.safeParse({
      name: "X",
      offer_type: "saas",
      ownership: "affiliate",
      destination_url: "not-a-url",
    });
    expect(parsed.success).toBe(false);
  });

  it("rejects unknown keys (strict)", () => {
    const parsed = createOfferSchema.safeParse({
      name: "X",
      offer_type: "other",
      ownership: "client",
      owner_id: "forge-me",
    });
    expect(parsed.success).toBe(false);
  });

  it("normalizes empty optional strings to null", () => {
    const parsed = createOfferSchema.safeParse({
      name: "X",
      offer_type: "other",
      ownership: "owned",
      short_description: "   ",
      target_audience: "",
    });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.short_description).toBeNull();
      expect(parsed.data.target_audience).toBeNull();
    }
  });

  it("rejects invalid offer_type", () => {
    const parsed = createOfferSchema.safeParse({
      name: "X",
      offer_type: "crm",
      ownership: "owned",
    });
    expect(parsed.success).toBe(false);
  });

  it("requires at least one patch field", () => {
    const parsed = patchOfferSchema.safeParse({});
    expect(parsed.success).toBe(false);
  });

  it("accepts status archive patch", () => {
    const parsed = patchOfferSchema.safeParse({ status: "archived" });
    expect(parsed.success).toBe(true);
  });
});
