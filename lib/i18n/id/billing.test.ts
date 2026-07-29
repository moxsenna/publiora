import { describe, expect, it } from "vitest";
import { formatCreditBalance, formatReaderCount, formatSectionCount } from "@/lib/i18n/id";

describe("Indonesian number formatters", () => {
  it("formats section and reader counts with id-ID numerals", () => {
    expect(formatSectionCount(1234)).toBe("1.234 bagian");
    expect(formatReaderCount(5678)).toBe("5.678 pembaca");
  });

  it("formats credit balance with id-ID numerals", () => {
    expect(formatCreditBalance(987654)).toBe("987.654 kredit");
  });
});
