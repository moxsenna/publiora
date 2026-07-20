import { z } from "zod";
import {
  CTA_URL_REQUIRED_GOALS,
  isValidCtaUrl,
  type CtaGoal,
} from "@/types/ai-suggestions";
import type { EbookType } from "@/types/project";
import type { Offer, ProjectOfferRelationship } from "@/types/offer";

const ctaGoalSchema = z.enum([
  "visit_product",
  "join_whatsapp",
  "claim_bonus",
  "buy_product",
  "follow_creator",
  "custom",
]);

export const wizardFormSchema = z
  .object({
    ebook_type: z.enum(["lead_magnet", "bonus_product", "sellable_ebook"]),
    template_id: z.string().nullable(),

    // V3 idea-first fields (common brief still supported)
    idea_text: z.string().trim().max(4000).optional().or(z.literal("")),
    topic: z.string().trim().max(200).optional().or(z.literal("")),
    audience: z.string().trim().max(500).optional().or(z.literal("")),
    primary_problem: z.string().trim().max(1000).optional().or(z.literal("")),
    desired_outcome: z.string().trim().max(1000).optional().or(z.literal("")),
    niche: z.string().trim().max(200).optional().or(z.literal("")),
    tone: z.string().trim().max(200).optional().or(z.literal("")),
    working_title: z.string().trim().max(120).optional().or(z.literal("")),
    author: z.string().trim().min(1, "Masukkan nama penulis.").max(120),
    additional_notes: z.string().trim().max(4000).optional().or(z.literal("")),

    // Offer selection (client-side only until submit)
    offer_mode: z.enum(["none", "existing", "quick_create"]).optional(),
    selected_offer_id: z.string().optional().nullable(),
    no_offer: z.boolean().optional(),

    // Lead magnet
    lead_goal: z
      .enum([
        "collect_email",
        "join_whatsapp",
        "webinar_registration",
        "book_call",
        "start_trial",
        "visit_offer",
        "other",
      ])
      .optional(),
    traffic_source: z.string().trim().max(200).optional().or(z.literal("")),
    next_offer: z.string().trim().max(500).optional().or(z.literal("")),
    post_read_action: ctaGoalSchema.optional(),
    cta_url: z.string().trim().max(2000).optional().or(z.literal("")),

    // Bonus
    parent_product: z.string().trim().max(500).optional().or(z.literal("")),
    bonus_role: z
      .enum([
        "implementation_aid",
        "ready_to_use_assets",
        "speed_to_result",
        "objection_handler",
        "increase_perceived_value",
        "support_next_step",
        "other",
      ])
      .optional(),
    bonus_intent: z.string().trim().max(1000).optional().or(z.literal("")),
    usage_moment: z.string().trim().max(500).optional().or(z.literal("")),

    // Sellable (V3 modes + legacy positioning)
    sellable_mode: z
      .enum(["standalone", "bundle_component", "entry_to_offer"])
      .optional(),
    sales_positioning: z
      .enum([
        "entry_product",
        "core_product",
        "premium_authority",
        "bundle_component",
      ])
      .optional(),
    buyer_objections_text: z
      .string()
      .trim()
      .max(2500)
      .optional()
      .or(z.literal("")),
  })
  .superRefine((val, ctx) => {
    const hasIdea =
      !!val.idea_text?.trim() ||
      !!val.topic?.trim() ||
      !!val.working_title?.trim();

    if (val.ebook_type === "lead_magnet") {
      if (!val.lead_goal) {
        ctx.addIssue({
          code: "custom",
          path: ["lead_goal"],
          message: "Pilih tujuan lead magnet.",
        });
      }
      if (!hasIdea) {
        ctx.addIssue({
          code: "custom",
          path: ["idea_text"],
          message: "Masukkan ide lead magnet.",
        });
      }
      if (val.post_read_action) {
        const requiresUrl = (CTA_URL_REQUIRED_GOALS as CtaGoal[]).includes(
          val.post_read_action,
        );
        if (requiresUrl) {
          const url = val.cta_url?.trim() ?? "";
          if (url && !isValidCtaUrl(url)) {
            ctx.addIssue({
              code: "custom",
              path: ["cta_url"],
              message: "Masukkan tautan HTTP atau HTTPS yang valid.",
            });
          }
        }
      }
    }

    if (val.ebook_type === "bonus_product") {
      if (!val.selected_offer_id && !val.parent_product?.trim()) {
        ctx.addIssue({
          code: "custom",
          path: ["selected_offer_id"],
          message: "Pilih atau buat produk utama untuk bonus ini.",
        });
      }
      if (!val.bonus_intent?.trim() && !val.desired_outcome?.trim()) {
        ctx.addIssue({
          code: "custom",
          path: ["bonus_intent"],
          message: "Jelaskan apa yang dibantu bonus ini.",
        });
      }
    }

    if (val.ebook_type === "sellable_ebook") {
      if (!val.sellable_mode && !val.sales_positioning) {
        ctx.addIssue({
          code: "custom",
          path: ["sellable_mode"],
          message: "Pilih peran ebook ini.",
        });
      }
      const mode = val.sellable_mode;
      if (
        (mode === "bundle_component" || mode === "entry_to_offer") &&
        !val.selected_offer_id
      ) {
        ctx.addIssue({
          code: "custom",
          path: ["selected_offer_id"],
          message: "Pilih penawaran terkait untuk mode ini.",
        });
      }
      if (!hasIdea) {
        ctx.addIssue({
          code: "custom",
          path: ["idea_text"],
          message: "Masukkan ide ebook.",
        });
      }
    }
  });

export type WizardFormValues = z.infer<typeof wizardFormSchema>;

export const STEP1_FIELDS: (keyof WizardFormValues)[] = ["ebook_type"];

export const STEP2_COMMON_FIELDS: (keyof WizardFormValues)[] = [
  "idea_text",
  "topic",
  "audience",
  "primary_problem",
  "desired_outcome",
  "niche",
  "tone",
  "working_title",
  "author",
  "additional_notes",
];

export function step2FieldsForType(
  ebookType: EbookType,
): (keyof WizardFormValues)[] {
  if (ebookType === "lead_magnet") {
    return [
      ...STEP2_COMMON_FIELDS,
      "lead_goal",
      "traffic_source",
      "selected_offer_id",
      "post_read_action",
      "cta_url",
    ];
  }
  if (ebookType === "bonus_product") {
    return [
      ...STEP2_COMMON_FIELDS,
      "selected_offer_id",
      "bonus_intent",
      "bonus_role",
      "usage_moment",
    ];
  }
  return [
    ...STEP2_COMMON_FIELDS,
    "sellable_mode",
    "sales_positioning",
    "selected_offer_id",
    "buyer_objections_text",
  ];
}

export function hasTypeSpecificDirty(
  values: WizardFormValues,
  ebookType: EbookType,
): boolean {
  if (ebookType === "lead_magnet") {
    return Boolean(
      values.lead_goal ||
        values.traffic_source?.trim() ||
        values.selected_offer_id ||
        values.next_offer?.trim() ||
        values.post_read_action ||
        values.cta_url?.trim(),
    );
  }
  if (ebookType === "bonus_product") {
    return Boolean(
      values.selected_offer_id ||
        values.parent_product?.trim() ||
        values.bonus_intent?.trim() ||
        values.bonus_role ||
        values.usage_moment?.trim(),
    );
  }
  return Boolean(
    values.sellable_mode ||
      values.sales_positioning ||
      values.selected_offer_id ||
      values.buyer_objections_text?.trim(),
  );
}

function relationshipForWizard(
  values: WizardFormValues,
): ProjectOfferRelationship | null {
  if (values.ebook_type === "lead_magnet") {
    return values.selected_offer_id || values.offer_mode === "existing"
      ? "promotes"
      : null;
  }
  if (values.ebook_type === "bonus_product") return "bonus_for";
  if (values.ebook_type === "sellable_ebook") {
    if (values.sellable_mode === "bundle_component") return "bundle_component";
    if (values.sellable_mode === "entry_to_offer") return "upsells_to";
    return null;
  }
  return null;
}

export function toCreateProjectV3(
  values: WizardFormValues,
  selectedOffer?: Offer | null,
) {
  const common = {
    idea_text: values.idea_text?.trim() || null,
    topic: values.topic?.trim() || null,
    audience: values.audience?.trim() || null,
    primary_problem: values.primary_problem?.trim() || null,
    desired_outcome: values.desired_outcome?.trim() || null,
    niche: values.niche?.trim() || null,
    tone: values.tone?.trim() || null,
    working_title: values.working_title?.trim() || null,
    author: values.author.trim(),
    additional_notes: values.additional_notes?.trim() || null,
  };

  const relationship = relationshipForWizard(values);
  let offer_context:
    | { mode: "none" }
    | {
        mode: "existing";
        offer_id: string;
        relationship: ProjectOfferRelationship;
      };

  if (selectedOffer && relationship) {
    offer_context = {
      mode: "existing",
      offer_id: selectedOffer.id,
      relationship,
    };
  } else if (values.selected_offer_id && relationship) {
    offer_context = {
      mode: "existing",
      offer_id: values.selected_offer_id,
      relationship,
    };
  } else {
    offer_context = { mode: "none" };
  }

  if (values.ebook_type === "lead_magnet") {
    return {
      version: 3 as const,
      ebook_type: "lead_magnet" as const,
      template_id: values.template_id,
      common,
      offer_context,
      business_context: {
        type: "lead_magnet" as const,
        lead_goal: values.lead_goal!,
        traffic_source: values.traffic_source?.trim() || null,
        post_read_action: values.post_read_action ?? null,
        cta_url: values.cta_url?.trim() || null,
      },
    };
  }

  if (values.ebook_type === "bonus_product") {
    return {
      version: 3 as const,
      ebook_type: "bonus_product" as const,
      template_id: values.template_id,
      common,
      offer_context,
      business_context: {
        type: "bonus_product" as const,
        bonus_role: values.bonus_role ?? null,
        bonus_intent:
          values.bonus_intent?.trim() ||
          values.desired_outcome?.trim() ||
          "Membantu pembeli produk utama",
        usage_moment: values.usage_moment?.trim() || null,
      },
    };
  }

  const objections = (values.buyer_objections_text ?? "")
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 8);

  const sellable_mode =
    values.sellable_mode ??
    (values.sales_positioning === "bundle_component"
      ? "bundle_component"
      : values.sales_positioning === "entry_product"
        ? "entry_to_offer"
        : "standalone");

  return {
    version: 3 as const,
    ebook_type: "sellable_ebook" as const,
    template_id: values.template_id,
    common,
    offer_context,
    business_context: {
      type: "sellable_ebook" as const,
      sales_positioning: sellable_mode as
        | "standalone"
        | "bundle_component"
        | "entry_to_offer",
      buyer_objections: objections,
    },
  };
}

/** @deprecated Prefer toCreateProjectV3 */
export function toCreateProjectV2(values: WizardFormValues) {
  // Bridge: map to V2 for compatibility if needed
  const common = {
    topic: values.topic?.trim() || values.idea_text?.trim() || "Topik baru",
    audience: values.audience?.trim() || "Akan dilengkapi",
    primary_problem: values.primary_problem?.trim() || "Akan dilengkapi",
    desired_outcome: values.desired_outcome?.trim() || "Akan dilengkapi",
    niche: values.niche?.trim() || "Umum",
    tone: values.tone?.trim() || null,
    working_title: values.working_title?.trim() || null,
    author: values.author.trim(),
    additional_notes: values.additional_notes?.trim() || null,
  };

  if (values.ebook_type === "lead_magnet") {
    return {
      version: 2 as const,
      ebook_type: "lead_magnet" as const,
      template_id: values.template_id,
      common,
      business_context: {
        type: "lead_magnet" as const,
        lead_goal: values.lead_goal!,
        traffic_source: values.traffic_source?.trim() || null,
        next_offer: values.next_offer?.trim() || null,
        post_read_action: values.post_read_action ?? "custom",
        cta_url: values.cta_url?.trim() || null,
      },
    };
  }

  if (values.ebook_type === "bonus_product") {
    return {
      version: 2 as const,
      ebook_type: "bonus_product" as const,
      template_id: values.template_id,
      common,
      business_context: {
        type: "bonus_product" as const,
        parent_product: values.parent_product?.trim() || "Produk utama",
        bonus_role: values.bonus_role ?? "other",
        usage_moment: values.usage_moment?.trim() || "Saat menggunakan produk",
      },
    };
  }

  const objections = (values.buyer_objections_text ?? "")
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 8);

  return {
    version: 2 as const,
    ebook_type: "sellable_ebook" as const,
    template_id: values.template_id,
    common,
    business_context: {
      type: "sellable_ebook" as const,
      sales_positioning: values.sales_positioning ?? "core_product",
      buyer_objections: objections,
    },
  };
}
