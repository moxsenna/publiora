import { describe, expect, it } from "vitest";
import {
  createProjectRequestV2Schema,
  legacyProjectInputSchema,
} from "@/lib/projects/create-project-schema";
import {
  buildProjectDescription,
  buildWorkingTitle,
  normalizeCreateProjectV2,
  normalizeLegacyCreateProject,
} from "@/lib/projects/normalize-create-project";
import type { CreateProjectRequestV2 } from "@/lib/projects/create-project-schema";

const ownerId = "user-1";

function leadValid(
  overrides?: Partial<CreateProjectRequestV2>,
): CreateProjectRequestV2 {
  return {
    version: 2,
    ebook_type: "lead_magnet",
    template_id: "tpl_checklist",
    common: {
      topic: "Lead Generation B2B",
      audience: "Founder SaaS tahap awal",
      primary_problem: "Sulit mendapatkan lead berkualitas",
      desired_outcome: "Rencana lead generation 30 hari",
      niche: "B2B SaaS Marketing",
      tone: "Praktis, jelas",
      working_title: null,
      author: "Bima",
      additional_notes: null,
    },
    business_context: {
      type: "lead_magnet",
      lead_goal: "collect_email",
      traffic_source: "Konten organik",
      next_offer: "Audit marketing gratis",
      post_read_action: "visit_product",
      cta_url: "https://example.com/audit",
    },
    ...overrides,
  };
}

describe("createProjectRequestV2Schema", () => {
  it("accepts valid lead magnet", () => {
    const parsed = createProjectRequestV2Schema.safeParse(leadValid());
    expect(parsed.success).toBe(true);
  });

  it("rejects lead invalid URL", () => {
    const parsed = createProjectRequestV2Schema.safeParse(
      leadValid({
        business_context: {
          type: "lead_magnet",
          lead_goal: "collect_email",
          traffic_source: null,
          next_offer: null,
          post_read_action: "visit_product",
          cta_url: "not-a-url",
        },
      }),
    );
    expect(parsed.success).toBe(false);
  });

  it("rejects lead missing required CTA URL", () => {
    const parsed = createProjectRequestV2Schema.safeParse(
      leadValid({
        business_context: {
          type: "lead_magnet",
          lead_goal: "collect_email",
          traffic_source: null,
          next_offer: null,
          post_read_action: "join_whatsapp",
          cta_url: null,
        },
      }),
    );
    expect(parsed.success).toBe(false);
  });

  it("accepts valid bonus", () => {
    const parsed = createProjectRequestV2Schema.safeParse({
      version: 2,
      ebook_type: "bonus_product",
      template_id: null,
      common: leadValid().common,
      business_context: {
        type: "bonus_product",
        parent_product: "Kelas TikTok Affiliate",
        bonus_role: "implementation_aid",
        usage_moment: "Setelah modul riset produk",
      },
    });
    expect(parsed.success).toBe(true);
  });

  it("rejects bonus missing parent product", () => {
    const parsed = createProjectRequestV2Schema.safeParse({
      version: 2,
      ebook_type: "bonus_product",
      template_id: null,
      common: leadValid().common,
      business_context: {
        type: "bonus_product",
        parent_product: "",
        bonus_role: "implementation_aid",
        usage_moment: "Setelah modul",
      },
    });
    expect(parsed.success).toBe(false);
  });

  it("accepts valid sellable", () => {
    const parsed = createProjectRequestV2Schema.safeParse({
      version: 2,
      ebook_type: "sellable_ebook",
      template_id: "tpl_playbook",
      common: leadValid().common,
      business_context: {
        type: "sellable_ebook",
        sales_positioning: "core_product",
        buyer_objections: ["Ragu cukup praktis"],
      },
    });
    expect(parsed.success).toBe(true);
  });

  it("rejects type/context mismatch", () => {
    const parsed = createProjectRequestV2Schema.safeParse({
      version: 2,
      ebook_type: "lead_magnet",
      template_id: null,
      common: leadValid().common,
      business_context: {
        type: "bonus_product",
        parent_product: "Kelas",
        bonus_role: "other",
        usage_moment: "Kapan saja",
      },
    });
    expect(parsed.success).toBe(false);
  });
});

describe("normalizeCreateProjectV2", () => {
  it("builds fallback title from topic", () => {
    expect(
      buildWorkingTitle({
        working_title: null,
        topic: "Lead Generation B2B",
        ebook_type: "lead_magnet",
      }),
    ).toBe("Panduan: Lead Generation B2B");
  });

  it("builds type fallback title", () => {
    expect(
      buildWorkingTitle({
        working_title: null,
        topic: null,
        ebook_type: "bonus_product",
      }),
    ).toBe("Bonus Pembelian Baru");
  });

  it("generates description without URL", () => {
    const desc = buildProjectDescription(leadValid());
    expect(desc).toContain("Founder SaaS");
    expect(desc).not.toContain("https://");
  });

  it("seeds strategy without fabricating promise/angle", () => {
    const result = normalizeCreateProjectV2(leadValid(), ownerId);
    expect(result.initialState.strategy.topic).toBe("Lead Generation B2B");
    expect(result.initialState.strategy.funnel_goal).toContain("email");
    expect(result.initialState.strategy.core_promise).toBeNull();
    expect(result.initialState.strategy.unique_angle).toBeNull();
    expect(result.projectInsert.cta_goal).toBe("visit_product");
    expect(result.projectInsert.cta_url).toBe("https://example.com/audit");
    expect(result.projectInsert.title).toBe("Panduan: Lead Generation B2B");
  });

  it("seeds bonus parent product", () => {
    const input: CreateProjectRequestV2 = {
      version: 2,
      ebook_type: "bonus_product",
      template_id: "tpl_implementation_guide",
      common: leadValid().common,
      business_context: {
        type: "bonus_product",
        parent_product: "Kelas TikTok Affiliate",
        bonus_role: "implementation_aid",
        usage_moment: "Setelah modul riset",
      },
    };
    const result = normalizeCreateProjectV2(input, ownerId);
    expect(result.initialState.strategy.product_or_offer).toBe(
      "Kelas TikTok Affiliate",
    );
    expect(result.initialState.strategy.bonus_role).toBe("implementation_aid");
    expect(result.initialState.missing_fields).toContain("core_promise");
  });
});

describe("legacy create", () => {
  it("normalizes legacy flat input", () => {
    const legacy = legacyProjectInputSchema.parse({
      title: "Ebook Lama",
      author: "A",
      description: "Deskripsi cukup panjang untuk legacy",
      audience: "Pemula",
      tone: "Santai",
      niche: "Marketing",
      ebook_type: "sellable_ebook",
    });
    const result = normalizeLegacyCreateProject(legacy, ownerId);
    expect(result.projectInsert.title).toBe("Ebook Lama");
    expect(result.projectInsert.ebook_type).toBe("sellable_ebook");
    expect(result.initialState.schema_version).toBe(3);
  });
});
