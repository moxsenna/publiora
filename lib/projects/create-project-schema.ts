// Create Project V2 request schema + legacy flat input.

import { z } from "zod";
import {
  CTA_URL_REQUIRED_GOALS,
  isValidCtaUrl,
  type CtaGoal,
} from "@/types/ai-suggestions";
import type {
  BonusRole,
  EbookType,
  LeadGoal,
  SalesPositioning,
} from "@/types/project";

const ebookTypeSchema = z.enum([
  "lead_magnet",
  "bonus_product",
  "sellable_ebook",
]);

const leadGoalSchema = z.enum([
  "collect_email",
  "join_whatsapp",
  "webinar_registration",
  "book_call",
  "start_trial",
  "visit_offer",
  "other",
]);

const bonusRoleSchema = z.enum([
  "implementation_aid",
  "ready_to_use_assets",
  "speed_to_result",
  "objection_handler",
  "increase_perceived_value",
  "support_next_step",
  "other",
]);

const salesPositioningSchema = z.enum([
  "entry_product",
  "core_product",
  "premium_authority",
  "bundle_component",
]);

const ctaGoalSchema = z.enum([
  "visit_product",
  "join_whatsapp",
  "claim_bonus",
  "buy_product",
  "follow_creator",
  "custom",
]);

const trimmed = (max: number, message: string) =>
  z
    .string()
    .trim()
    .min(1, message)
    .max(max, `Maksimal ${max} karakter`);

const optionalTrimmed = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .nullable()
    .transform((v) => {
      if (v == null) return null;
      const t = v.trim();
      return t.length > 0 ? t : null;
    });

const commonSchema = z.object({
  topic: trimmed(200, "Masukkan topik utama."),
  audience: trimmed(500, "Masukkan target pembaca."),
  primary_problem: trimmed(1000, "Jelaskan masalah utama."),
  desired_outcome: trimmed(1000, "Jelaskan hasil yang ingin diberikan."),
  niche: trimmed(200, "Masukkan niche."),
  tone: optionalTrimmed(200),
  working_title: optionalTrimmed(120),
  author: trimmed(120, "Masukkan nama penulis."),
  additional_notes: optionalTrimmed(4000),
});

const leadContextSchema = z
  .object({
    type: z.literal("lead_magnet"),
    lead_goal: leadGoalSchema,
    traffic_source: optionalTrimmed(200),
    next_offer: optionalTrimmed(500),
    post_read_action: ctaGoalSchema,
    cta_url: optionalTrimmed(2000),
  })
  .superRefine((val, ctx) => {
    const requiresUrl = (CTA_URL_REQUIRED_GOALS as CtaGoal[]).includes(
      val.post_read_action,
    );
    if (requiresUrl) {
      if (!val.cta_url) {
        ctx.addIssue({
          code: "custom",
          path: ["cta_url"],
          message: "Masukkan tautan HTTP atau HTTPS yang valid.",
        });
        return;
      }
      if (!isValidCtaUrl(val.cta_url)) {
        ctx.addIssue({
          code: "custom",
          path: ["cta_url"],
          message: "Masukkan tautan HTTP atau HTTPS yang valid.",
        });
      }
    }
  });

const bonusContextSchema = z.object({
  type: z.literal("bonus_product"),
  parent_product: trimmed(500, "Masukkan produk utama untuk bonus ini."),
  bonus_role: bonusRoleSchema,
  usage_moment: trimmed(500, "Jelaskan kapan bonus akan digunakan."),
});

const sellableContextSchema = z.object({
  type: z.literal("sellable_ebook"),
  sales_positioning: salesPositioningSchema,
  buyer_objections: z
    .array(z.string().trim().min(1).max(300))
    .max(8)
    .optional()
    .default([])
    .transform((arr) =>
      arr.map((s) => s.trim()).filter((s) => s.length > 0),
    ),
});

const businessContextSchema = z.discriminatedUnion("type", [
  leadContextSchema,
  bonusContextSchema,
  sellableContextSchema,
]);

export const createProjectRequestV2Schema = z
  .object({
    version: z.literal(2),
    ebook_type: ebookTypeSchema,
    template_id: z
      .string()
      .trim()
      .min(1)
      .nullable()
      .optional()
      .transform((v) => (v && v.trim().length > 0 ? v.trim() : null)),
    common: commonSchema,
    business_context: businessContextSchema,
  })
  .superRefine((val, ctx) => {
    if (val.ebook_type !== val.business_context.type) {
      ctx.addIssue({
        code: "custom",
        path: ["business_context", "type"],
        message: "Tipe ebook dan konteks bisnis tidak cocok.",
      });
    }
  });

export type CreateProjectRequestV2 = z.infer<
  typeof createProjectRequestV2Schema
>;

/** Legacy flat ProjectInput (compatibility window). */
export const legacyProjectInputSchema = z.object({
  title: z.string().trim().min(1, "title is required").max(120),
  author: z.string().trim().min(1, "author is required").max(120),
  subtitle: z.string().trim().max(200).optional().nullable(),
  description: z.string().trim().min(1, "description is required").max(4000),
  audience: z.string().trim().min(1, "audience is required").max(500),
  tone: z.string().trim().min(1, "tone is required").max(200),
  niche: z.string().trim().min(1, "niche is required").max(200),
  ebook_type: ebookTypeSchema.optional().default("lead_magnet"),
  template_id: z.string().trim().min(1).optional().nullable(),
});

export type LegacyProjectInput = z.infer<typeof legacyProjectInputSchema>;

export function isCreateProjectV2(body: unknown): boolean {
  return (
    typeof body === "object" &&
    body !== null &&
    (body as { version?: unknown }).version === 2
  );
}

export function isCreateProjectV3(body: unknown): boolean {
  return (
    typeof body === "object" &&
    body !== null &&
    (body as { version?: unknown }).version === 3
  );
}

const projectOfferRelationshipSchema = z.enum([
  "promotes",
  "bonus_for",
  "bundle_component",
  "upsells_to",
  "cross_sells_to",
]);

const offerTypeSchema = z.enum([
  "digital_product",
  "course",
  "service",
  "saas",
  "membership",
  "webinar",
  "physical_product",
  "affiliate_product",
  "other",
]);

const offerOwnershipSchema = z.enum(["owned", "affiliate", "client"]);

const quickCreateOfferInProjectSchema = z
  .object({
    name: z.string().trim().min(1).max(160),
    offer_type: offerTypeSchema,
    ownership: offerOwnershipSchema,
    destination_url: optionalTrimmed(2000),
    short_description: optionalTrimmed(1000),
    target_audience: optionalTrimmed(500),
    primary_outcome: optionalTrimmed(500),
    niche: optionalTrimmed(200),
  })
  .strict()
  .superRefine((val, ctx) => {
    if (val.destination_url && !isValidCtaUrl(val.destination_url)) {
      ctx.addIssue({
        code: "custom",
        path: ["destination_url"],
        message: "URL harus valid (http/https).",
      });
    }
  });

const offerContextNoneSchema = z
  .object({
    mode: z.literal("none"),
  })
  .strict();

const offerContextExistingSchema = z
  .object({
    mode: z.literal("existing"),
    offer_id: z.string().uuid(),
    relationship: projectOfferRelationshipSchema,
  })
  .strict();

const offerContextQuickSchema = z
  .object({
    mode: z.literal("quick_create"),
    offer: quickCreateOfferInProjectSchema,
    relationship: projectOfferRelationshipSchema,
  })
  .strict();

const offerContextSchema = z.discriminatedUnion("mode", [
  offerContextNoneSchema,
  offerContextExistingSchema,
  offerContextQuickSchema,
]);

const commonV3Schema = z.object({
  idea_text: optionalTrimmed(4000),
  topic: optionalTrimmed(200),
  audience: optionalTrimmed(500),
  primary_problem: optionalTrimmed(1000),
  desired_outcome: optionalTrimmed(1000),
  niche: optionalTrimmed(200),
  tone: optionalTrimmed(200),
  working_title: optionalTrimmed(120),
  author: trimmed(120, "Masukkan nama penulis."),
  additional_notes: optionalTrimmed(4000),
});

const leadBusinessV3Schema = z
  .object({
    type: z.literal("lead_magnet"),
    lead_goal: leadGoalSchema,
    traffic_source: optionalTrimmed(200),
    post_read_action: ctaGoalSchema.optional().nullable(),
    cta_url: optionalTrimmed(2000),
  })
  .strict();

const bonusBusinessV3Schema = z
  .object({
    type: z.literal("bonus_product"),
    bonus_role: bonusRoleSchema.nullable().optional(),
    bonus_intent: trimmed(1000, "Jelaskan apa yang dibantu bonus ini."),
    usage_moment: optionalTrimmed(500),
  })
  .strict();

const sellableBusinessV3Schema = z
  .object({
    type: z.literal("sellable_ebook"),
    sales_positioning: z.enum([
      "standalone",
      "bundle_component",
      "entry_to_offer",
    ]),
    buyer_objections: z
      .array(z.string().trim().min(1).max(300))
      .max(8)
      .optional()
      .default([])
      .transform((arr) => arr.map((s) => s.trim()).filter((s) => s.length > 0)),
  })
  .strict();

const businessContextV3Schema = z.discriminatedUnion("type", [
  leadBusinessV3Schema,
  bonusBusinessV3Schema,
  sellableBusinessV3Schema,
]);

export const createProjectRequestV3Schema = z
  .object({
    version: z.literal(3),
    ebook_type: ebookTypeSchema,
    template_id: z
      .string()
      .trim()
      .min(1)
      .nullable()
      .optional()
      .transform((v) => (v && v.trim().length > 0 ? v.trim() : null)),
    common: commonV3Schema,
    offer_context: offerContextSchema,
    business_context: businessContextV3Schema,
  })
  .strict()
  .superRefine((val, ctx) => {
    if (val.ebook_type !== val.business_context.type) {
      ctx.addIssue({
        code: "custom",
        path: ["business_context", "type"],
        message: "Tipe ebook dan konteks bisnis tidak cocok.",
      });
    }

    const offerMode = val.offer_context.mode;
    const relationship =
      offerMode === "none" ? null : val.offer_context.relationship;

    // Reject client-submitted snapshots / owner ids if present via unknown keys
    // (strict object already blocks unknown keys)

    if (val.ebook_type === "lead_magnet") {
      if (
        relationship &&
        relationship !== "promotes" &&
        relationship !== "upsells_to"
      ) {
        ctx.addIssue({
          code: "custom",
          path: ["offer_context", "relationship"],
          message: "Relasi Lead Magnet harus promotes atau upsells_to.",
        });
      }
      if (
        !val.common.topic &&
        !val.common.idea_text &&
        !val.common.working_title
      ) {
        ctx.addIssue({
          code: "custom",
          path: ["common", "idea_text"],
          message: "Masukkan ide lead magnet.",
        });
      }
    }

    if (val.ebook_type === "bonus_product") {
      if (offerMode === "none") {
        ctx.addIssue({
          code: "custom",
          path: ["offer_context"],
          message: "Bonus Pembelian membutuhkan produk utama.",
        });
      }
      if (relationship && relationship !== "bonus_for") {
        ctx.addIssue({
          code: "custom",
          path: ["offer_context", "relationship"],
          message: "Relasi Bonus harus bonus_for.",
        });
      }
    }

    if (
      val.ebook_type === "sellable_ebook" &&
      val.business_context.type === "sellable_ebook"
    ) {
      const mode = val.business_context.sales_positioning;
      if (mode === "standalone") {
        if (offerMode !== "none") {
          ctx.addIssue({
            code: "custom",
            path: ["offer_context"],
            message: "Ebook mandiri tidak memerlukan penawaran terhubung.",
          });
        }
      } else if (mode === "bundle_component") {
        if (offerMode === "none" || relationship !== "bundle_component") {
          ctx.addIssue({
            code: "custom",
            path: ["offer_context"],
            message: "Mode bundle membutuhkan penawaran dengan relasi bundle_component.",
          });
        }
      } else if (mode === "entry_to_offer") {
        if (offerMode === "none" || relationship !== "upsells_to") {
          ctx.addIssue({
            code: "custom",
            path: ["offer_context"],
            message: "Mode entry membutuhkan penawaran dengan relasi upsells_to.",
          });
        }
      }
    }
  });

export type CreateProjectRequestV3 = z.infer<
  typeof createProjectRequestV3Schema
>;

export type {
  EbookType,
  LeadGoal,
  BonusRole,
  SalesPositioning,
  CtaGoal,
};
