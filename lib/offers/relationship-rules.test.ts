import { describe, expect, it } from "vitest";
import {
  assertRelationshipAllowed,
  defaultRelationshipForEbookType,
  isOfferRequiredForEbookType,
  isRelationshipAllowed,
  relationshipForSellableMode,
} from "./relationship-rules";

describe("relationship-rules", () => {
  it("allows lead_magnet + promotes", () => {
    expect(
      isRelationshipAllowed({
        ebookType: "lead_magnet",
        relationship: "promotes",
      }),
    ).toBe(true);
  });

  it("allows lead_magnet + upsells_to", () => {
    expect(
      isRelationshipAllowed({
        ebookType: "lead_magnet",
        relationship: "upsells_to",
      }),
    ).toBe(true);
  });

  it("allows bonus_product + bonus_for", () => {
    expect(
      isRelationshipAllowed({
        ebookType: "bonus_product",
        relationship: "bonus_for",
      }),
    ).toBe(true);
  });

  it("rejects bonus_product + promotes", () => {
    expect(
      isRelationshipAllowed({
        ebookType: "bonus_product",
        relationship: "promotes",
      }),
    ).toBe(false);
  });

  it("allows sellable_ebook + bundle_component", () => {
    expect(
      isRelationshipAllowed({
        ebookType: "sellable_ebook",
        relationship: "bundle_component",
      }),
    ).toBe(true);
  });

  it("rejects sellable_ebook + bonus_for", () => {
    expect(
      isRelationshipAllowed({
        ebookType: "sellable_ebook",
        relationship: "bonus_for",
      }),
    ).toBe(false);
  });

  it("assertRelationshipAllowed throws on mismatch", () => {
    expect(() =>
      assertRelationshipAllowed({
        ebookType: "bonus_product",
        relationship: "promotes",
      }),
    ).toThrow(/relationship_not_allowed/);
  });

  it("maps default relationships", () => {
    expect(defaultRelationshipForEbookType("lead_magnet")).toBe("promotes");
    expect(defaultRelationshipForEbookType("bonus_product")).toBe("bonus_for");
    expect(defaultRelationshipForEbookType("sellable_ebook")).toBeNull();
  });

  it("maps sellable modes", () => {
    expect(relationshipForSellableMode("standalone")).toBeNull();
    expect(relationshipForSellableMode("bundle_component")).toBe(
      "bundle_component",
    );
    expect(relationshipForSellableMode("entry_to_offer")).toBe("upsells_to");
  });

  it("requires offer for bonus; optional for lead; conditional for sellable", () => {
    expect(isOfferRequiredForEbookType("bonus_product")).toBe(true);
    expect(isOfferRequiredForEbookType("lead_magnet")).toBe(false);
    expect(isOfferRequiredForEbookType("sellable_ebook", "standalone")).toBe(
      false,
    );
    expect(
      isOfferRequiredForEbookType("sellable_ebook", "bundle_component"),
    ).toBe(true);
    expect(isOfferRequiredForEbookType("sellable_ebook", "entry_to_offer")).toBe(
      true,
    );
  });
});
