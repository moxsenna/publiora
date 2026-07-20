import { describe, expect, it } from "vitest";
import {
  createOfferSchema,
  linkOfferToProjectSchema,
  syncProjectOfferSchema,
} from "./schemas";
import { isRelationshipAllowed } from "./relationship-rules";
import { buildOfferContextSnapshot } from "./snapshot";
import { offerInsertFromCreate } from "./map-row";

describe("offer API contracts", () => {
  it("create payload never accepts owner_id", () => {
    const parsed = createOfferSchema.safeParse({
      name: "X",
      offer_type: "service",
      ownership: "owned",
      owner_id: "attacker",
    });
    expect(parsed.success).toBe(false);
  });

  it("server insert sets owner from auth, not body", () => {
    const parsed = createOfferSchema.parse({
      name: "X",
      offer_type: "service",
      ownership: "owned",
    });
    const insert = offerInsertFromCreate(parsed, "auth-user-id");
    expect(insert.owner_id).toBe("auth-user-id");
    expect(insert.status).toBe("active");
  });

  it("link schema requires uuid offer and relationship", () => {
    const ok = linkOfferToProjectSchema.safeParse({
      offer_id: "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
      relationship: "promotes",
    });
    expect(ok.success).toBe(true);

    const bad = linkOfferToProjectSchema.safeParse({
      offer_id: "not-uuid",
      relationship: "promotes",
    });
    expect(bad.success).toBe(false);
  });

  it("rejects invalid relationships for ebook types", () => {
    expect(
      isRelationshipAllowed({
        ebookType: "bonus_product",
        relationship: "promotes",
      }),
    ).toBe(false);
    expect(
      isRelationshipAllowed({
        ebookType: "lead_magnet",
        relationship: "promotes",
      }),
    ).toBe(true);
  });

  it("sync requires at least one field", () => {
    const parsed = syncProjectOfferSchema.safeParse({
      link_id: "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
      fields: [],
    });
    expect(parsed.success).toBe(false);
  });

  it("snapshot excludes owner secrets", () => {
    const snap = buildOfferContextSnapshot({
      id: "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
      name: "A",
      offer_type: "service",
      ownership: "affiliate",
      short_description: null,
      target_audience: null,
      primary_problem: null,
      primary_outcome: null,
      niche: null,
      destination_url: "https://example.com",
    });
    expect(snap).not.toHaveProperty("owner_id");
    expect(snap.ownership).toBe("affiliate");
  });
});
