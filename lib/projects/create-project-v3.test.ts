import { describe, expect, it } from "vitest";
import { createProjectRequestV3Schema } from "./create-project-schema";
import { normalizeCreateProjectV3 } from "./normalize-create-project";

const baseCommon = {
  idea_text: "Checklist growth audit 7 hari",
  topic: null,
  audience: null,
  primary_problem: null,
  desired_outcome: null,
  niche: null,
  tone: null,
  working_title: null,
  author: "Bima",
  additional_notes: null,
};

describe("create project v3", () => {
  it("accepts lead without offer", () => {
    const parsed = createProjectRequestV3Schema.safeParse({
      version: 3,
      ebook_type: "lead_magnet",
      template_id: null,
      common: baseCommon,
      offer_context: { mode: "none" },
      business_context: {
        type: "lead_magnet",
        lead_goal: "collect_email",
      },
    });
    expect(parsed.success).toBe(true);
  });

  it("accepts lead with existing offer promotes", () => {
    const parsed = createProjectRequestV3Schema.safeParse({
      version: 3,
      ebook_type: "lead_magnet",
      template_id: null,
      common: baseCommon,
      offer_context: {
        mode: "existing",
        offer_id: "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
        relationship: "promotes",
      },
      business_context: {
        type: "lead_magnet",
        lead_goal: "visit_offer",
      },
    });
    expect(parsed.success).toBe(true);
  });

  it("accepts lead quick create offer", () => {
    const parsed = createProjectRequestV3Schema.safeParse({
      version: 3,
      ebook_type: "lead_magnet",
      template_id: null,
      common: baseCommon,
      offer_context: {
        mode: "quick_create",
        relationship: "promotes",
        offer: {
          name: "Audit SaaS",
          offer_type: "service",
          ownership: "owned",
        },
      },
      business_context: {
        type: "lead_magnet",
        lead_goal: "book_call",
      },
    });
    expect(parsed.success).toBe(true);
  });

  it("rejects bonus without offer", () => {
    const parsed = createProjectRequestV3Schema.safeParse({
      version: 3,
      ebook_type: "bonus_product",
      template_id: null,
      common: { ...baseCommon, idea_text: "Worksheet implementasi" },
      offer_context: { mode: "none" },
      business_context: {
        type: "bonus_product",
        bonus_intent: "Mempraktikkan materi produk",
        bonus_role: null,
        usage_moment: null,
      },
    });
    expect(parsed.success).toBe(false);
  });

  it("accepts bonus with existing offer", () => {
    const parsed = createProjectRequestV3Schema.safeParse({
      version: 3,
      ebook_type: "bonus_product",
      template_id: null,
      common: { ...baseCommon, idea_text: "Worksheet implementasi" },
      offer_context: {
        mode: "existing",
        offer_id: "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
        relationship: "bonus_for",
      },
      business_context: {
        type: "bonus_product",
        bonus_intent: "Mempraktikkan materi produk",
        bonus_role: "implementation_aid",
        usage_moment: null,
      },
    });
    expect(parsed.success).toBe(true);
  });

  it("accepts sellable standalone without offer", () => {
    const parsed = createProjectRequestV3Schema.safeParse({
      version: 3,
      ebook_type: "sellable_ebook",
      template_id: null,
      common: { ...baseCommon, idea_text: "Playbook growth" },
      offer_context: { mode: "none" },
      business_context: {
        type: "sellable_ebook",
        sales_positioning: "standalone",
        buyer_objections: [],
      },
    });
    expect(parsed.success).toBe(true);
  });

  it("requires offer for sellable bundle", () => {
    const bad = createProjectRequestV3Schema.safeParse({
      version: 3,
      ebook_type: "sellable_ebook",
      template_id: null,
      common: { ...baseCommon, idea_text: "Playbook" },
      offer_context: { mode: "none" },
      business_context: {
        type: "sellable_ebook",
        sales_positioning: "bundle_component",
        buyer_objections: [],
      },
    });
    expect(bad.success).toBe(false);

    const ok = createProjectRequestV3Schema.safeParse({
      version: 3,
      ebook_type: "sellable_ebook",
      template_id: null,
      common: { ...baseCommon, idea_text: "Playbook" },
      offer_context: {
        mode: "existing",
        offer_id: "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
        relationship: "bundle_component",
      },
      business_context: {
        type: "sellable_ebook",
        sales_positioning: "bundle_component",
        buyer_objections: [],
      },
    });
    expect(ok.success).toBe(true);
  });

  it("rejects relationship mismatch", () => {
    const parsed = createProjectRequestV3Schema.safeParse({
      version: 3,
      ebook_type: "bonus_product",
      template_id: null,
      common: { ...baseCommon, idea_text: "X" },
      offer_context: {
        mode: "existing",
        offer_id: "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
        relationship: "promotes",
      },
      business_context: {
        type: "bonus_product",
        bonus_intent: "Bantu implementasi",
      },
    });
    expect(parsed.success).toBe(false);
  });

  it("rejects client snapshot fields", () => {
    const parsed = createProjectRequestV3Schema.safeParse({
      version: 3,
      ebook_type: "lead_magnet",
      template_id: null,
      common: baseCommon,
      offer_context: { mode: "none" },
      business_context: {
        type: "lead_magnet",
        lead_goal: "collect_email",
      },
      context_snapshot: { version: 1 },
    });
    expect(parsed.success).toBe(false);
  });

  it("normalizes v3 with offer prefill", () => {
    const parsed = createProjectRequestV3Schema.parse({
      version: 3,
      ebook_type: "lead_magnet",
      template_id: null,
      common: baseCommon,
      offer_context: {
        mode: "existing",
        offer_id: "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
        relationship: "promotes",
      },
      business_context: {
        type: "lead_magnet",
        lead_goal: "visit_offer",
      },
    });
    const normalized = normalizeCreateProjectV3(parsed, "user-1", {
      name: "Growth Audit",
      target_audience: "Founder SaaS",
      niche: "SaaS",
      destination_url: "https://example.com",
    });
    expect(normalized.projectInsert.owner_id).toBe("user-1");
    expect(normalized.projectInsert.audience).toBe("Founder SaaS");
    expect(normalized.projectInsert.cta_url).toBe("https://example.com");
    expect(normalized.initialState.strategy.product_or_offer).toBe(
      "Growth Audit",
    );
    expect(normalized.offerLink.mode).toBe("existing");
  });
});
