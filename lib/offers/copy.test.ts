import { describe, expect, it } from "vitest";
import {
  OFFER_OWNERSHIP_LABELS,
  OFFER_STATUS_LABELS,
  OFFER_TYPE_LABELS,
  PROJECT_OFFER_RELATIONSHIP_LABELS,
} from "./copy";
import {
  OFFER_OWNERSHIPS,
  OFFER_STATUSES,
  OFFER_TYPES,
  PROJECT_OFFER_RELATIONSHIPS,
} from "@/types/offer";

describe("offer display catalogs", () => {
  it("maps every approved offer type", () => {
    expect(Object.keys(OFFER_TYPE_LABELS)).toEqual(OFFER_TYPES);
    expect(Object.values(OFFER_TYPE_LABELS)).not.toContain("");
  });

  it("maps every approved ownership without changing values", () => {
    expect(Object.keys(OFFER_OWNERSHIP_LABELS)).toEqual(OFFER_OWNERSHIPS);
    expect(OFFER_OWNERSHIP_LABELS.affiliate).toBe("Afiliasi");
  });

  it("maps every approved status and relationship", () => {
    expect(Object.keys(OFFER_STATUS_LABELS)).toEqual(OFFER_STATUSES);
    expect(Object.keys(PROJECT_OFFER_RELATIONSHIP_LABELS)).toEqual(
      PROJECT_OFFER_RELATIONSHIPS,
    );
  });
});
