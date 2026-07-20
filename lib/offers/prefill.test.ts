import { describe, expect, it } from "vitest";
import {
  applyOfferPrefill,
  buildOfferPrefill,
  clearOfferDerivedFields,
  markFieldUserEdited,
} from "./prefill";

const offer = {
  name: "Growth Audit",
  target_audience: "Founder SaaS",
  primary_problem: "Growth stuck",
  primary_outcome: "Find bottlenecks",
  niche: "SaaS",
  destination_url: "https://example.com",
  short_description: "Audit",
};

describe("prefill", () => {
  it("maps offer fields", () => {
    const result = buildOfferPrefill(offer);
    expect(result.values.audience).toBe("Founder SaaS");
    expect(result.values.product_or_offer).toBe("Growth Audit");
    expect(result.values.cta_url).toBe("https://example.com");
    expect(result.sources.audience).toBe("offer");
  });

  it("fills empty fields only", () => {
    const prefill = buildOfferPrefill(offer);
    const applied = applyOfferPrefill({
      current: { audience: "Manual audience", niche: null },
      origins: { audience: "user" },
      prefill,
    });
    expect(applied.values.audience).toBe("Manual audience");
    expect(applied.values.niche).toBe("SaaS");
    expect(applied.origins.niche).toBe("offer");
  });

  it("replaces offer-derived when requested", () => {
    const prefill = buildOfferPrefill({
      ...offer,
      niche: "SaaS B2B",
    });
    const applied = applyOfferPrefill({
      current: { niche: "SaaS" },
      origins: { niche: "offer" },
      prefill,
      replaceOfferDerived: true,
    });
    expect(applied.values.niche).toBe("SaaS B2B");
  });

  it("never overwrites user fields", () => {
    const prefill = buildOfferPrefill(offer);
    const applied = applyOfferPrefill({
      current: { audience: "User typed" },
      origins: { audience: "user" },
      prefill,
      replaceOfferDerived: true,
    });
    expect(applied.values.audience).toBe("User typed");
  });

  it("clears only offer-derived on detach", () => {
    const cleared = clearOfferDerivedFields({
      current: {
        audience: "From offer",
        primary_problem: "User problem",
      },
      origins: {
        audience: "offer",
        primary_problem: "user",
      },
    });
    expect(cleared.values.audience).toBeNull();
    expect(cleared.values.primary_problem).toBe("User problem");
    expect(cleared.origins.audience).toBe("empty");
  });

  it("marks user edits", () => {
    const next = markFieldUserEdited({ audience: "offer" }, "audience");
    expect(next.audience).toBe("user");
  });

  it("does not mutate input objects", () => {
    const current = { audience: null as string | null };
    const origins = {};
    const prefill = buildOfferPrefill(offer);
    applyOfferPrefill({ current, origins, prefill });
    expect(current.audience).toBeNull();
  });
});
