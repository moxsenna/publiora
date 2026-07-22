import { describe, expect, it } from "vitest";
import {
  buildPendingGenerationQueue,
  estimateGenerationCost,
} from "@/components/workspace/useSequentialSectionGeneration";
import type { OutlineSection } from "@/types/outline";
import type { Section } from "@/types/section";

function os(
  id: string,
  title: string,
  status: OutlineSection["status"] = "pending",
): OutlineSection {
  return {
    id,
    position: 1,
    title,
    summary: "summary here for tests",
    key_points: ["a point", "b point"],
    estimated_words: 500,
    status,
  };
}

function sec(
  outlineId: string,
  status: Section["status"],
  html: string,
): Section {
  return {
    id: `s-${outlineId}`,
    project_id: "p1",
    outline_section_id: outlineId,
    position: 1,
    title: "T",
    content_html: html,
    word_count: 10,
    status,
    updated_at: "2026-07-23T00:00:00.000Z",
  };
}

describe("buildPendingGenerationQueue", () => {
  it("queues pending and failed only by default", () => {
    const outline = [
      os("a", "One"),
      os("b", "Two"),
      os("c", "Three", "failed"),
    ];
    const map = new Map<string, Section>([
      ["a", sec("a", "generated", "<p>done content here</p>")],
      ["c", sec("c", "failed", "")],
    ]);
    const q = buildPendingGenerationQueue({
      outlineSections: outline,
      sectionsByOutlineId: map,
    });
    expect(q.map((x) => x.outline_section_id)).toEqual(["b", "c"]);
  });

  it("can include completed for rewrite-all", () => {
    const outline = [os("a", "One"), os("b", "Two")];
    const map = new Map<string, Section>([
      ["a", sec("a", "generated", "<p>done content here</p>")],
    ]);
    const q = buildPendingGenerationQueue({
      outlineSections: outline,
      sectionsByOutlineId: map,
      includeCompleted: true,
    });
    expect(q.map((x) => x.outline_section_id)).toEqual(["a", "b"]);
  });
});

describe("estimateGenerationCost", () => {
  it("multiplies section cost", () => {
    expect(estimateGenerationCost(6, 10)).toBe(60);
    expect(estimateGenerationCost(0, 10)).toBe(0);
  });
});
