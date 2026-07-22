import { describe, expect, it } from "vitest";
import {
  emptyGenerationMemory,
  formatMemoryForPrompt,
  mergeWriterMetaIntoMemory,
  normalizeGenerationMemory,
} from "@/lib/generation-memory/merge";

describe("generation memory merge", () => {
  it("starts empty and normalizes junk", () => {
    expect(emptyGenerationMemory().version).toBe(1);
    expect(normalizeGenerationMemory(null).examples_used).toEqual([]);
    expect(normalizeGenerationMemory({ examples_used: ["A", "a", "B"] }).examples_used).toEqual([
      "A",
      "B",
    ]);
  });

  it("merges writer meta with dedupe and caps", () => {
    const base = emptyGenerationMemory();
    base.examples_used = ["Ex A"];
    const merged = mergeWriterMetaIntoMemory({
      memory: base,
      section_id: "os1",
      section_summary: "Covered funnel mapping in depth for beginners.",
      meta: {
        terms_defined: ["Funnel", "funnel"],
        examples_used: ["Ex A", "Ex B"],
        frameworks_used: ["4P"],
        claims_or_numbers: ["n/a"],
        offer_mention_count: 2,
        contains_cta: false,
      },
    });
    expect(merged.examples_used).toEqual(["Ex A", "Ex B"]);
    expect(merged.terminology).toEqual(["Funnel"]);
    expect(merged.frameworks_defined).toEqual(["4P"]);
    expect(merged.offer_mentions_total).toBe(2);
    expect(merged.section_summaries.os1).toMatch(/funnel mapping/i);
  });

  it("caps arrays at limits", () => {
    const base = emptyGenerationMemory();
    base.terminology = Array.from({ length: 50 }, (_, i) => `term${i}`);
    const merged = mergeWriterMetaIntoMemory({
      memory: base,
      section_id: "x",
      section_summary: "Enough characters for a summary of this section body.",
      meta: {
        terms_defined: ["newterm"],
        examples_used: [],
        frameworks_used: [],
        claims_or_numbers: [],
        offer_mention_count: 0,
        contains_cta: false,
      },
    });
    expect(merged.terminology.length).toBe(50);
    expect(merged.terminology).not.toContain("newterm");
  });

  it("formats compact prompt text", () => {
    const empty = formatMemoryForPrompt(null);
    expect(empty).toMatch(/empty/i);
    const filled = formatMemoryForPrompt({
      version: 1,
      terminology: ["CTA"],
      examples_used: ["Cafe owner"],
      frameworks_defined: [],
      claims_or_numbers: [],
      promises_made: [],
      offer_mentions_total: 1,
      section_summaries: { s1: "Introduced the problem space for freelancers." },
    });
    expect(filled).toContain("Cafe owner");
    expect(filled).toContain("s1:");
  });
});
