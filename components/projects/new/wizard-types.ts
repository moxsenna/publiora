import { z } from "zod";
import {
  CTA_URL_REQUIRED_GOALS,
  isValidCtaUrl,
  type CtaGoal,
} from "@/types/ai-suggestions";
import type { EbookType } from "@/types/project";

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

    topic: z.string().trim().min(1, "Masukkan topik utama.").max(200),
    audience: z.string().trim().min(1, "Masukkan target pembaca.").max(500),
    primary_problem: z
      .string()
      .trim()
      .min(1, "Jelaskan masalah utama.")
      .max(1000),
    desired_outcome: z
      .string()
      .trim()
      .min(1, "Jelaskan hasil yang ingin diberikan.")
      .max(1000),
    niche: z.string().trim().min(1, "Masukkan niche.").max(200),
    tone: z.string().trim().max(200).optional().or(z.literal("")),
    working_title: z.string().trim().max(120).optional().or(z.literal("")),
    author: z.string().trim().min(1, "Masukkan nama penulis.").max(120),
    additional_notes: z.string().trim().max(4000).optional().or(z.literal("")),

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
    usage_moment: z.string().trim().max(500).optional().or(z.literal("")),

    // Sellable
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
    if (val.ebook_type === "lead_magnet") {
      if (!val.lead_goal) {
        ctx.addIssue({
          code: "custom",
          path: ["lead_goal"],
          message: "Pilih tujuan lead magnet.",
        });
      }
      if (!val.post_read_action) {
        ctx.addIssue({
          code: "custom",
          path: ["post_read_action"],
          message: "Pilih aksi setelah membaca.",
        });
      } else {
        const requiresUrl = (CTA_URL_REQUIRED_GOALS as CtaGoal[]).includes(
          val.post_read_action,
        );
        if (requiresUrl) {
          const url = val.cta_url?.trim() ?? "";
          if (!url || !isValidCtaUrl(url)) {
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
      if (!val.parent_product?.trim()) {
        ctx.addIssue({
          code: "custom",
          path: ["parent_product"],
          message: "Masukkan produk utama untuk bonus ini.",
        });
      }
      if (!val.bonus_role) {
        ctx.addIssue({
          code: "custom",
          path: ["bonus_role"],
          message: "Pilih fungsi bonus.",
        });
      }
      if (!val.usage_moment?.trim()) {
        ctx.addIssue({
          code: "custom",
          path: ["usage_moment"],
          message: "Jelaskan kapan bonus akan digunakan.",
        });
      }
    }

    if (val.ebook_type === "sellable_ebook") {
      if (!val.sales_positioning) {
        ctx.addIssue({
          code: "custom",
          path: ["sales_positioning"],
          message: "Pilih posisi produk.",
        });
      }
    }
  });

export type WizardFormValues = z.infer<typeof wizardFormSchema>;

export const STEP1_FIELDS: (keyof WizardFormValues)[] = ["ebook_type"];

export const STEP2_COMMON_FIELDS: (keyof WizardFormValues)[] = [
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
      "next_offer",
      "post_read_action",
      "cta_url",
    ];
  }
  if (ebookType === "bonus_product") {
    return [
      ...STEP2_COMMON_FIELDS,
      "parent_product",
      "bonus_role",
      "usage_moment",
    ];
  }
  return [...STEP2_COMMON_FIELDS, "sales_positioning", "buyer_objections_text"];
}

export function hasTypeSpecificDirty(
  values: WizardFormValues,
  ebookType: EbookType,
): boolean {
  if (ebookType === "lead_magnet") {
    return Boolean(
      values.lead_goal ||
        values.traffic_source?.trim() ||
        values.next_offer?.trim() ||
        values.post_read_action ||
        values.cta_url?.trim(),
    );
  }
  if (ebookType === "bonus_product") {
    return Boolean(
      values.parent_product?.trim() ||
        values.bonus_role ||
        values.usage_moment?.trim(),
    );
  }
  return Boolean(
    values.sales_positioning || values.buyer_objections_text?.trim(),
  );
}

export function toCreateProjectV2(values: WizardFormValues) {
  const common = {
    topic: values.topic.trim(),
    audience: values.audience.trim(),
    primary_problem: values.primary_problem.trim(),
    desired_outcome: values.desired_outcome.trim(),
    niche: values.niche.trim(),
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
        post_read_action: values.post_read_action!,
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
        parent_product: values.parent_product!.trim(),
        bonus_role: values.bonus_role!,
        usage_moment: values.usage_moment!.trim(),
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
      sales_positioning: values.sales_positioning!,
      buyer_objections: objections,
    },
  };
}
