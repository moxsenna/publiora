import { describe, expect, it, vi } from "vitest";
import {
  markFieldOriginUser,
  registerOriginAware,
} from "@/components/projects/new/useOriginAwareField";
import type { FieldOrigin } from "@/lib/offers/prefill";
import {
  applyOfferPrefill,
  buildOfferPrefill,
} from "@/lib/offers/prefill";

describe("registerOriginAware", () => {
  it("marks origin user on change", () => {
    let origins: Partial<Record<string, FieldOrigin>> = {
      audience: "offer",
    };
    const setFieldOrigins = (
      next:
        | Partial<Record<string, FieldOrigin>>
        | ((
            prev: Partial<Record<string, FieldOrigin>>,
          ) => Partial<Record<string, FieldOrigin>>),
    ) => {
      origins = typeof next === "function" ? next(origins) : next;
    };

    const onChange = vi.fn();
    const register = vi.fn(() => ({
      onChange,
      onBlur: vi.fn(),
      name: "audience",
      ref: vi.fn(),
    }));

    const reg = registerOriginAware(
      register as never,
      setFieldOrigins,
      "audience" as never,
    );
    reg.onChange({ target: { value: "Founder SaaS awal" } } as never);
    expect(origins.audience).toBe("user");
    expect(onChange).toHaveBeenCalled();
  });

  it("user-edited audience survives Offer B replacement", () => {
    const offerA = {
      name: "A",
      target_audience: "Founder SaaS awal",
      primary_problem: "P1",
      primary_outcome: "O1",
      niche: "SaaS",
      destination_url: "https://a.example",
      short_description: "A",
    };
    const offerB = {
      name: "B",
      target_audience: "Tim marketing B2B",
      primary_problem: "P2",
      primary_outcome: "O2",
      niche: "B2B",
      destination_url: "https://b.example",
      short_description: "B",
    };

    let origins: Partial<Record<string, FieldOrigin>> = {};
    let values = {
      audience: null as string | null,
      niche: null as string | null,
    };

    // Offer A prefills
    let applied = applyOfferPrefill({
      current: values,
      origins,
      prefill: buildOfferPrefill(offerA),
    });
    values = { ...values, ...applied.values };
    origins = applied.origins;
    expect(values.audience).toBe("Founder SaaS awal");

    // user edits audience
    markFieldOriginUser((next) => {
      origins = typeof next === "function" ? next(origins) : next;
    }, "audience");
    values.audience = "Founder SaaS awal (edited)";

    // Offer B selected — user audience remains
    applied = applyOfferPrefill({
      current: values,
      origins,
      prefill: buildOfferPrefill(offerB),
      replaceOfferDerived: true,
    });
    expect(applied.values.audience).toBe("Founder SaaS awal (edited)");
    // untouched offer field may update
    expect(applied.values.niche).toBe("B2B");
  });
});
