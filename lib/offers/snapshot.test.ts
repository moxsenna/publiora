import { describe, expect, it } from "vitest";
import {
  applySnapshotFields,
  buildOfferContextSnapshot,
  diffOfferSnapshot,
  sourceIsNewer,
} from "./snapshot";
import type { Offer } from "@/types/offer";

const baseOffer: Offer = {
  id: "11111111-1111-1111-1111-111111111111",
  owner_id: "owner-should-not-appear",
  name: "Growth Audit",
  offer_type: "service",
  ownership: "owned",
  status: "active",
  short_description: "desc",
  target_audience: "founders",
  primary_problem: "stuck",
  primary_outcome: "clarity",
  niche: "saas",
  destination_url: "https://example.com",
  created_at: "2026-01-01T00:00:00.000Z",
  updated_at: "2026-01-02T00:00:00.000Z",
};

describe("snapshot", () => {
  it("whitelists snapshot fields and omits owner_id", () => {
    const snap = buildOfferContextSnapshot(baseOffer);
    expect(snap.version).toBe(1);
    expect(snap.offer_id).toBe(baseOffer.id);
    expect(snap.name).toBe("Growth Audit");
    expect(snap).not.toHaveProperty("owner_id");
    expect(snap).not.toHaveProperty("status");
    expect(snap).not.toHaveProperty("created_at");
    expect(Object.keys(snap).sort()).toEqual(
      [
        "destination_url",
        "name",
        "niche",
        "offer_id",
        "offer_type",
        "ownership",
        "primary_outcome",
        "primary_problem",
        "short_description",
        "target_audience",
        "version",
      ].sort(),
    );
  });

  it("keeps null values stable", () => {
    const snap = buildOfferContextSnapshot({
      ...baseOffer,
      short_description: null,
      destination_url: null,
    });
    expect(snap.short_description).toBeNull();
    expect(snap.destination_url).toBeNull();
  });

  it("detects newer source", () => {
    expect(
      sourceIsNewer("2026-02-01T00:00:00.000Z", "2026-01-01T00:00:00.000Z"),
    ).toBe(true);
    expect(
      sourceIsNewer("2026-01-01T00:00:00.000Z", "2026-02-01T00:00:00.000Z"),
    ).toBe(false);
  });

  it("diffs and applies selected fields only", () => {
    const current = buildOfferContextSnapshot(baseOffer);
    const next = buildOfferContextSnapshot({
      ...baseOffer,
      target_audience: "founders + growth",
      name: "Growth Audit Pro",
    });
    const diff = diffOfferSnapshot(current, next);
    expect(diff.map((d) => d.field).sort()).toEqual(
      ["name", "target_audience"].sort(),
    );

    const applied = applySnapshotFields(current, next, ["target_audience"]);
    expect(applied.target_audience).toBe("founders + growth");
    expect(applied.name).toBe("Growth Audit");
  });
});
