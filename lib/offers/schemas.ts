// Zod schemas for Offer Library create / quick-create / patch / link / sync.

import { z } from "zod";
import { isValidCtaUrl } from "@/types/ai-suggestions";
import {
  OFFER_OWNERSHIPS,
  OFFER_STATUSES,
  OFFER_TYPES,
  PROJECT_OFFER_RELATIONSHIPS,
} from "@/types/offer";

export const offerTypeSchema = z.enum(
  OFFER_TYPES as [string, ...string[]],
);

export const offerOwnershipSchema = z.enum(
  OFFER_OWNERSHIPS as [string, ...string[]],
);

export const offerStatusSchema = z.enum(
  OFFER_STATUSES as [string, ...string[]],
);

export const projectOfferRelationshipSchema = z.enum(
  PROJECT_OFFER_RELATIONSHIPS as [string, ...string[]],
);

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

const optionalValidHttpUrl = (max: number) =>
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
    })
    .refine((v) => v === null || isValidCtaUrl(v), {
      message: "URL harus valid (http/https).",
    });

export const createOfferSchema = z
  .object({
    name: z.string().trim().min(1).max(160),
    offer_type: offerTypeSchema,
    ownership: offerOwnershipSchema,

    short_description: optionalTrimmed(2000),
    target_audience: optionalTrimmed(1000),
    primary_problem: optionalTrimmed(1000),
    primary_outcome: optionalTrimmed(1000),
    niche: optionalTrimmed(300),
    destination_url: optionalValidHttpUrl(2000),
  })
  .strict();

export const quickCreateOfferSchema = z
  .object({
    name: z.string().trim().min(1).max(160),
    offer_type: offerTypeSchema,
    ownership: offerOwnershipSchema,
    destination_url: optionalValidHttpUrl(2000),

    short_description: optionalTrimmed(1000),
    target_audience: optionalTrimmed(500),
    primary_outcome: optionalTrimmed(500),
    niche: optionalTrimmed(200),
  })
  .strict();

/** Optional field that stays absent when not provided (for patch). */
const patchOptionalTrimmed = (max: number) =>
  z
    .union([z.string(), z.null()])
    .optional()
    .transform((v) => {
      if (v === undefined) return undefined;
      if (v == null) return null;
      const t = v.trim();
      return t.length > 0 ? t : null;
    })
    .pipe(
      z
        .union([z.string().max(max), z.null()])
        .optional(),
    );

const patchOptionalUrl = (max: number) =>
  z
    .union([z.string(), z.null()])
    .optional()
    .transform((v) => {
      if (v === undefined) return undefined;
      if (v == null) return null;
      const t = v.trim();
      return t.length > 0 ? t : null;
    })
    .refine((v) => v === undefined || v === null || isValidCtaUrl(v), {
      message: "URL harus valid (http/https).",
    })
    .pipe(
      z
        .union([z.string().max(max), z.null()])
        .optional(),
    );

export const patchOfferSchema = z
  .object({
    name: z.string().trim().min(1).max(160).optional(),
    offer_type: offerTypeSchema.optional(),
    ownership: offerOwnershipSchema.optional(),
    status: offerStatusSchema.optional(),

    short_description: patchOptionalTrimmed(2000),
    target_audience: patchOptionalTrimmed(1000),
    primary_problem: patchOptionalTrimmed(1000),
    primary_outcome: patchOptionalTrimmed(1000),
    niche: patchOptionalTrimmed(300),
    destination_url: patchOptionalUrl(2000),
  })
  .strict()
  .superRefine((obj, ctx) => {
    const hasField = Object.values(obj).some((value) => value !== undefined);
    if (!hasField) {
      ctx.addIssue({
        code: "custom",
        message: "Minimal satu field harus diubah.",
      });
    }
  });

export const linkOfferToProjectSchema = z
  .object({
    offer_id: z.string().uuid(),
    relationship: projectOfferRelationshipSchema,
    is_primary: z.boolean().default(true),
    replace_primary: z.boolean().optional().default(false),
  })
  .strict();

export const syncOfferFieldSchema = z.enum([
  "name",
  "short_description",
  "target_audience",
  "primary_problem",
  "primary_outcome",
  "niche",
  "destination_url",
]);

export const syncProjectOfferSchema = z
  .object({
    link_id: z.string().uuid(),
    fields: z.array(syncOfferFieldSchema).min(1),
    apply_to_strategy: z.boolean().default(false),
    apply_to_project_cta: z.boolean().default(false),
  })
  .strict();

export type CreateOfferInput = z.infer<typeof createOfferSchema>;
export type QuickCreateOfferInput = z.infer<typeof quickCreateOfferSchema>;
export type PatchOfferInput = z.infer<typeof patchOfferSchema>;
export type LinkOfferToProjectInput = z.infer<typeof linkOfferToProjectSchema>;
export type SyncProjectOfferInput = z.infer<typeof syncProjectOfferSchema>;
