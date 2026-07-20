import { describe, expect, it } from "vitest";
import {
  hasTypeSpecificDirty,
  step2FieldsForType,
  toCreateProjectV2,
  wizardFormSchema,
  type WizardFormValues,
} from "@/components/projects/new/wizard-types";

function base(overrides: Partial<WizardFormValues> = {}): WizardFormValues {
  return {
    ebook_type: "lead_magnet",
    template_id: null,
    idea_text: "Ide lead magnet singkat",
    topic: "Topik",
    audience: "Audiens",
    primary_problem: "Masalah",
    desired_outcome: "Hasil",
    niche: "Niche",
    tone: "Praktis, jelas",
    working_title: "",
    author: "Penulis",
    additional_notes: "",
    offer_mode: "none",
    selected_offer_id: null,
    no_offer: true,
    lead_goal: "collect_email",
    traffic_source: "Konten organik",
    next_offer: "Offer",
    post_read_action: "visit_product",
    cta_url: "https://example.com",
    parent_product: "",
    bonus_role: undefined,
    bonus_intent: "",
    usage_moment: "",
    sellable_mode: undefined,
    sales_positioning: undefined,
    buyer_objections_text: "",
    ...overrides,
  };
}

describe("wizardFormSchema", () => {
  it("accepts valid lead magnet", () => {
    const r = wizardFormSchema.safeParse(base());
    expect(r.success).toBe(true);
  });

  it("accepts lead without CTA URL when offer not required", () => {
    const r = wizardFormSchema.safeParse(
      base({ cta_url: "", post_read_action: "join_whatsapp" }),
    );
    // V3: CTA URL may be deferred; invalid URL only when provided
    expect(r.success).toBe(true);
  });

  it("accepts bonus with selected offer", () => {
    const r = wizardFormSchema.safeParse(
      base({
        ebook_type: "bonus_product",
        lead_goal: undefined,
        post_read_action: undefined,
        cta_url: "",
        selected_offer_id: "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
        offer_mode: "existing",
        no_offer: false,
        parent_product: "Kelas X",
        bonus_intent: "Mempraktikkan materi produk",
        bonus_role: "implementation_aid",
        usage_moment: "Setelah modul",
      }),
    );
    expect(r.success).toBe(true);
  });

  it("blocks bonus without offer", () => {
    const r = wizardFormSchema.safeParse(
      base({
        ebook_type: "bonus_product",
        lead_goal: undefined,
        post_read_action: undefined,
        parent_product: "",
        selected_offer_id: null,
        bonus_intent: "Mempraktikkan materi",
        bonus_role: "implementation_aid",
        usage_moment: "Kapan saja",
      }),
    );
    expect(r.success).toBe(false);
  });

  it("accepts sellable standalone mode", () => {
    const r = wizardFormSchema.safeParse(
      base({
        ebook_type: "sellable_ebook",
        lead_goal: undefined,
        post_read_action: undefined,
        sellable_mode: "standalone",
        sales_positioning: "core_product",
      }),
    );
    expect(r.success).toBe(true);
  });
});

describe("toCreateProjectV2", () => {
  it("maps lead payload snapshot", () => {
    const payload = toCreateProjectV2(base({ template_id: "tpl_checklist" }));
    expect(payload).toMatchObject({
      version: 2,
      ebook_type: "lead_magnet",
      template_id: "tpl_checklist",
      business_context: {
        type: "lead_magnet",
        lead_goal: "collect_email",
        post_read_action: "visit_product",
        cta_url: "https://example.com",
      },
    });
  });

  it("maps bonus payload snapshot", () => {
    const payload = toCreateProjectV2(
      base({
        ebook_type: "bonus_product",
        parent_product: "Kelas X",
        bonus_role: "ready_to_use_assets",
        usage_moment: "Saat mengikuti produk utama",
        lead_goal: undefined,
        post_read_action: undefined,
      }),
    );
    expect(payload.business_context).toMatchObject({
      type: "bonus_product",
      parent_product: "Kelas X",
      bonus_role: "ready_to_use_assets",
    });
  });

  it("maps sellable objections from lines", () => {
    const payload = toCreateProjectV2(
      base({
        ebook_type: "sellable_ebook",
        sales_positioning: "premium_authority",
        buyer_objections_text: "Ragu praktis\nTidak ada waktu\n",
        lead_goal: undefined,
        post_read_action: undefined,
      }),
    );
    expect(payload.business_context).toMatchObject({
      type: "sellable_ebook",
      sales_positioning: "premium_authority",
      buyer_objections: ["Ragu praktis", "Tidak ada waktu"],
    });
  });
});

describe("wizard helpers", () => {
  it("step2 fields differ by type", () => {
    expect(step2FieldsForType("lead_magnet")).toContain("lead_goal");
    expect(step2FieldsForType("bonus_product")).toContain("selected_offer_id");
    expect(step2FieldsForType("bonus_product")).toContain("bonus_intent");
    expect(step2FieldsForType("sellable_ebook")).toContain("sellable_mode");
  });

  it("detects type-specific dirty state", () => {
    expect(hasTypeSpecificDirty(base(), "lead_magnet")).toBe(true);
    expect(
      hasTypeSpecificDirty(
        base({
          lead_goal: undefined,
          post_read_action: undefined,
          cta_url: "",
          traffic_source: "",
          next_offer: "",
        }),
        "lead_magnet",
      ),
    ).toBe(false);
  });
});
