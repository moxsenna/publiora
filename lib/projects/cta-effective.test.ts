import { describe, expect, it } from "vitest";
import { validateEffectiveCta } from "./cta-effective";

describe("validateEffectiveCta", () => {
  it("rejects clearing URL while required goal remains", () => {
    const msg = validateEffectiveCta(
      { cta_goal: "join_whatsapp", cta_url: "https://wa.me/1" },
      { cta_url: null },
    );
    expect(msg).toMatch(/required/i);
  });

  it("allows required goal when existing URL stays", () => {
    const msg = validateEffectiveCta(
      { cta_goal: "custom", cta_url: "https://example.com/x" },
      { cta_goal: "join_whatsapp" },
    );
    expect(msg).toBeNull();
  });

  it("rejects required goal without any URL", () => {
    const msg = validateEffectiveCta(
      { cta_goal: null, cta_url: null },
      { cta_goal: "visit_product" },
    );
    expect(msg).toMatch(/required/i);
  });

  it("allows custom goal without URL", () => {
    const msg = validateEffectiveCta(
      { cta_goal: null, cta_url: null },
      { cta_goal: "custom", final_cta: "Buy now" },
    );
    expect(msg).toBeNull();
  });

  it("rejects invalid non-null URL", () => {
    const msg = validateEffectiveCta(
      { cta_goal: "custom", cta_url: null },
      { cta_url: "javascript:alert(1)" },
    );
    expect(msg).toMatch(/valid/i);
  });
});
