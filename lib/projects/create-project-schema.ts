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

export type {
  EbookType,
  LeadGoal,
  BonusRole,
  SalesPositioning,
  CtaGoal,
};
