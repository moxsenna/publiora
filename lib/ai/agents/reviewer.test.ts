import { describe, expect, it, vi } from "vitest";
import * as provider from "@/lib/ai/provider";
import {
  buildReviewerUserPrompt,
  runQualityReviewer,
} from "@/lib/ai/agents/reviewer";
import { resolveFormatContext } from "@/lib/templates/format-context";
import type { EbookStrategy } from "@/types/strategy";

const strategy: EbookStrategy = {
  topic: "T",
  audience: "A",
  audience_sophistication: null,
  primary_problem: "P",
  pain_points: [],
  desired_outcome: "O",
  core_promise: "Promise",
  unique_angle: "Angle",
  content_pillars: [],
  product_or_offer: null,
  funnel_goal: null,
  cta_goal: null,
  tone: "practical",
  traffic_source: null,
  bonus_role: null,
  usage_moment: null,
  sales_positioning: null,
  buyer_objections: [],
};

describe("reviewer", () => {
  it("builds prompt without mutating content instructions to rewrite", () => {
    const prompt = buildReviewerUserPrompt({
      project: {
        title: "Ebook",
        audience: "A",
        tone: "practical",
        niche: "n",
        ebook_type: "lead_magnet",
      },
      strategy,
      format_context: resolveFormatContext({
        ebookType: "lead_magnet",
        templateId: "tpl_checklist",
      }),
      outline_sections: [
        {
          id: "os1",
          title: "Intro",
          summary: "Start",
          position: 1,
        },
      ],
      sections: [
        {
          id: "s1",
          outline_section_id: "os1",
          title: "Intro",
          content_html: "<p>Hello world content</p>",
          word_count: 3,
        },
      ],
    });
    expect(prompt).toContain("format: checklist");
    expect(prompt).toMatch(/suggestions only/i);
    expect(prompt).not.toMatch(/rewrite content_html and save/i);
  });

  it("parses strict schema and rejects invalid", async () => {
    const spy = vi.spyOn(provider, "completeJson").mockResolvedValue({
      summary: "Overall the draft is practical but needs stronger transitions.",
      issues: [
        {
          severity: "warning",
          category: "structure",
          section_id: "s1",
          title: "Weak transition",
          explanation: "Section jumps without bridge from previous idea.",
          suggested_action: "Add one bridging sentence at the opening.",
        },
      ],
    });

    const result = await runQualityReviewer({
      project: {
        title: "Ebook",
        audience: "A",
        tone: "practical",
        niche: "n",
        ebook_type: "lead_magnet",
      },
      strategy,
      format_context: resolveFormatContext({
        ebookType: "lead_magnet",
        templateId: null,
      }),
      outline_sections: [],
      sections: [],
    });
    expect(result.issues).toHaveLength(1);
    expect(result.issues[0].section_id).toBe("s1");
    spy.mockRestore();
  });
});
