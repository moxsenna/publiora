// Map offer fields into wizard / strategy values without mutating inputs.

import type { Offer, OfferContextSnapshot } from "@/types/offer";

export type FieldOrigin = "empty" | "offer" | "user" | "ai";

export type WizardPrefillValues = {
  audience?: string | null;
  primary_problem?: string | null;
  niche?: string | null;
  product_or_offer?: string | null;
  cta_url?: string | null;
  short_description?: string | null;
  primary_outcome?: string | null;
};

export interface OfferPrefillResult {
  values: WizardPrefillValues;
  sources: Partial<Record<keyof WizardPrefillValues, "offer">>;
}

type OfferLike = Pick<
  Offer | OfferContextSnapshot,
  | "name"
  | "target_audience"
  | "primary_problem"
  | "primary_outcome"
  | "niche"
  | "destination_url"
  | "short_description"
>;

/**
 * Build suggested wizard values from an offer.
 * Does not read or mutate current form state.
 */
export function buildOfferPrefill(offer: OfferLike): OfferPrefillResult {
  const values: WizardPrefillValues = {};
  const sources: OfferPrefillResult["sources"] = {};

  if (offer.target_audience) {
    values.audience = offer.target_audience;
    sources.audience = "offer";
  }
  if (offer.primary_problem) {
    values.primary_problem = offer.primary_problem;
    sources.primary_problem = "offer";
  }
  if (offer.niche) {
    values.niche = offer.niche;
    sources.niche = "offer";
  }
  if (offer.name) {
    values.product_or_offer = offer.name;
    sources.product_or_offer = "offer";
  }
  if (offer.destination_url) {
    values.cta_url = offer.destination_url;
    sources.cta_url = "offer";
  }
  if (offer.short_description) {
    values.short_description = offer.short_description;
    sources.short_description = "offer";
  }
  if (offer.primary_outcome) {
    values.primary_outcome = offer.primary_outcome;
    sources.primary_outcome = "offer";
  }

  return { values, sources };
}

/**
 * Merge prefill into current values using origin tracking.
 * Never overwrites user/ai-origin fields. Empty fields may fill.
 * Offer-origin fields may replace when replaceOfferDerived is true.
 */
export function applyOfferPrefill(params: {
  current: WizardPrefillValues;
  origins: Partial<Record<keyof WizardPrefillValues, FieldOrigin>>;
  prefill: OfferPrefillResult;
  replaceOfferDerived?: boolean;
}): {
  values: WizardPrefillValues;
  origins: Partial<Record<keyof WizardPrefillValues, FieldOrigin>>;
} {
  const values: WizardPrefillValues = { ...params.current };
  const origins: Partial<Record<keyof WizardPrefillValues, FieldOrigin>> = {
    ...params.origins,
  };

  for (const key of Object.keys(params.prefill.values) as Array<
    keyof WizardPrefillValues
  >) {
    const nextVal = params.prefill.values[key];
    if (nextVal == null || nextVal === "") continue;

    const origin = origins[key] ?? "empty";
    const currentVal = values[key];
    const isEmpty =
      currentVal == null ||
      (typeof currentVal === "string" && currentVal.trim() === "");

    if (isEmpty || origin === "empty") {
      values[key] = nextVal;
      origins[key] = "offer";
      continue;
    }

    if (origin === "offer" && params.replaceOfferDerived) {
      values[key] = nextVal;
      origins[key] = "offer";
    }
    // user / ai: never overwrite
  }

  return { values, origins };
}

/**
 * When detaching an offer, clear only fields still marked as offer-derived.
 */
export function clearOfferDerivedFields(params: {
  current: WizardPrefillValues;
  origins: Partial<Record<keyof WizardPrefillValues, FieldOrigin>>;
}): {
  values: WizardPrefillValues;
  origins: Partial<Record<keyof WizardPrefillValues, FieldOrigin>>;
} {
  const values: WizardPrefillValues = { ...params.current };
  const origins: Partial<Record<keyof WizardPrefillValues, FieldOrigin>> = {
    ...params.origins,
  };

  for (const key of Object.keys(origins) as Array<keyof WizardPrefillValues>) {
    if (origins[key] === "offer") {
      values[key] = null;
      origins[key] = "empty";
    }
  }

  return { values, origins };
}

export function markFieldUserEdited(
  origins: Partial<Record<keyof WizardPrefillValues, FieldOrigin>>,
  field: keyof WizardPrefillValues,
): Partial<Record<keyof WizardPrefillValues, FieldOrigin>> {
  return { ...origins, [field]: "user" };
}
