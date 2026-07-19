import { describe, expect, it } from "vitest";
import { buildWriterUserPrompt } from "./writer";
import type { EbookStrategy } from "@/types/strategy";

const strategy: EbookStrategy = {
  topic: "Affiliate systems",
  audience: "Beginner freelancers",
  audience_sophistication: "beginner",
  primary_problem: "No funnel",
  pain_points: ["Inconsistent income"],
  desired_outcome: "Book calls weekly",
  core_promise: "First system in 7 days",
  unique_angle: "No ad budget",
  content_pillars: ["Offer", "Traffic"],
  product_or_offer: "WhatsApp group",
  funnel_goal: "join_whatsapp",
  cta_goal: "join_whatsapp",
  tone: "practical",
};

describe("buildWriterUserPrompt", () => {
  it("includes strategy promise, neighbors, and target words", () => {
    const prompt = buildWriterUserPrompt({
      project: {
        title: "Ebook",
        audience: "Beginners",
        tone: "practical",
        niche: "affiliate",
        ebook_type: "lead_magnet",
      },
      strategy,
      outlineSections: [
        {
          id: "a",
          title: "Intro",
          summary: "Start here",
          position: 1,
        },
        {
          id: "b",
          title: "Core",
          summary: "Main system",
          position: 2,
        },
        {
          id: "c",
          title: "Close",
          summary: "CTA",
          position: 3,
        },
      ],
      section: {
        id: "b",
        title: "Core",
        summary: "Main system",
        key_points: ["Map", "Mistakes"],
        estimated_words: 800,
        position: 2,
      },
      previousSection: { title: "Intro", summary: "Start here" },
      nextSection: { title: "Close", summary: "CTA" },
      previousSectionBodySummary: "We opened with the freelancing problem.",
    });

    expect(prompt).toContain("core_promise: First system in 7 days");
    expect(prompt).toContain("unique_angle: No ad budget");
    expect(prompt).toContain("previous: Intro");
    expect(prompt).toContain("next: Close");
    expect(prompt).toContain("target_words: 800");
    expect(prompt).toContain("Full outline");
    expect(prompt).toContain("previous_body_summary:");
  });

  it("handles missing strategy and first section", () => {
    const prompt = buildWriterUserPrompt({
      project: {
        title: "Ebook",
        audience: "A",
        tone: "t",
        niche: "n",
      },
      section: {
        title: "Only",
        summary: "S",
        key_points: ["k1", "k2"],
      },
    });
    expect(prompt).toContain("Strategy: (not available");
    expect(prompt).toContain("previous: (none");
  });
});
