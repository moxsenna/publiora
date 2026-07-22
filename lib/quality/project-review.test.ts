import { describe, expect, it } from "vitest";
import {
  buildSemanticReviewChecks,
  mergeWorkflowChecks,
} from "@/lib/quality/project-review";
import { resolveFormatContext } from "@/lib/templates/format-context";
import type { Project } from "@/types/project";
import type { Outline } from "@/types/outline";
import type { Section } from "@/types/section";
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

function project(overrides: Partial<Project> = {}): Project {
  return {
    id: "p1",
    owner_id: "u1",
    title: "Title",
    author: "Author",
    subtitle: null,
    description: "",
    audience: "",
    tone: "",
    niche: "",
    ebook_type: "lead_magnet",
    status: "draft",
    template_id: "tpl_checklist",
    progress: 0,
    sections_generated: 0,
    total_sections: 0,
    created_at: "",
    updated_at: "",
    published_at: null,
    cover_color: "#000",
    cta_goal: null,
    final_cta: null,
    cta_url: null,
    ...overrides,
  };
}

describe("buildSemanticReviewChecks", () => {
  it("flags format section count mismatch", () => {
    const format = resolveFormatContext({
      ebookType: "lead_magnet",
      templateId: "tpl_checklist",
    });
    const outline: Outline = {
      id: "o1",
      project_id: "p1",
      title: "O",
      description: "D",
      approved: true,
      approved_at: null,
      created_at: "",
      updated_at: "",
      sections: [
        {
          id: "os1",
          position: 1,
          title: "Only one",
          summary: "summary",
          key_points: ["a point", "b point"],
          estimated_words: 400,
          status: "pending",
        },
      ],
    };
    const checks = buildSemanticReviewChecks({
      project: project(),
      strategy,
      format_context: format,
      outline,
      sections: [],
    });
    expect(
      checks.some((c) => c.code === "section_count_out_of_range"),
    ).toBe(true);
  });

  it("flags missing key points and repeated openings", () => {
    const format = resolveFormatContext({
      ebookType: "lead_magnet",
      templateId: "tpl_checklist",
    });
    const opening = Array.from({ length: 90 }, (_, i) => `same${i}`).join(" ");
    const outline: Outline = {
      id: "o1",
      project_id: "p1",
      title: "O",
      description: "D",
      approved: true,
      approved_at: null,
      created_at: "",
      updated_at: "",
      sections: [
        {
          id: "os1",
          position: 1,
          title: "A",
          summary: "s",
          key_points: ["Map funnel stages carefully"],
          estimated_words: 400,
          status: "generated",
        },
        {
          id: "os2",
          position: 2,
          title: "B",
          summary: "s",
          key_points: ["Avoid traffic mistakes early"],
          estimated_words: 400,
          status: "generated",
        },
      ],
    };
    const sections: Section[] = [
      {
        id: "s1",
        project_id: "p1",
        outline_section_id: "os1",
        position: 1,
        title: "A",
        content_html: `<p>${opening} extra words here for length</p><ul><li>a</li><li>b</li><li>c</li></ul>`,
        word_count: 100,
        status: "generated",
        updated_at: "",
      },
      {
        id: "s2",
        project_id: "p1",
        outline_section_id: "os2",
        position: 2,
        title: "B",
        content_html: `<p>${opening} more extra words here for length</p><ul><li>a</li><li>b</li><li>c</li></ul>`,
        word_count: 100,
        status: "generated",
        updated_at: "",
      },
    ];
    const checks = buildSemanticReviewChecks({
      project: project(),
      strategy,
      format_context: format,
      outline,
      sections,
    });
    expect(checks.some((c) => c.code === "repeated_opening")).toBe(true);
    expect(checks.some((c) => c.section_id === "s1" || c.section_id === "s2")).toBe(
      true,
    );
  });
});

describe("mergeWorkflowChecks", () => {
  it("dedupes by id", () => {
    const merged = mergeWorkflowChecks(
      [{ id: "a", label: "A", severity: "warning" }],
      [
        { id: "a", label: "A2", severity: "blocker" },
        { id: "b", label: "B", severity: "warning" },
      ],
    );
    expect(merged).toHaveLength(2);
    expect(merged[0].label).toBe("A");
  });
});
