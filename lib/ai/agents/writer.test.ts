import { describe, expect, it } from "vitest";
import { buildWriterUserPrompt } from "./writer";
import type { EbookStrategy } from "@/types/strategy";
import { resolveFormatContext } from "@/lib/templates/format-context";

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
  traffic_source: null,
  bonus_role: null,
  usage_moment: null,
  sales_positioning: null,
  buyer_objections: [],
};

const checklistFormat = resolveFormatContext({
  ebookType: "lead_magnet",
  templateId: "tpl_checklist",
});

const workbookFormat = resolveFormatContext({
  ebookType: "bonus_product",
  templateId: "tpl_workbook",
});

const implementationFormat = resolveFormatContext({
  ebookType: "bonus_product",
  templateId: "tpl_implementation_guide",
});

const quickWinFormat = resolveFormatContext({
  ebookType: "lead_magnet",
  templateId: "tpl_quick_win",
});

describe("buildWriterUserPrompt", () => {
  it("includes strategy promise, neighbors, target words, and FormatContext", () => {
    const prompt = buildWriterUserPrompt({
      project: {
        title: "Ebook",
        audience: "Beginners",
        tone: "practical",
        niche: "affiliate",
        ebook_type: "lead_magnet",
      },
      strategy,
      format_context: checklistFormat,
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
    expect(prompt).toContain("Selected format (FormatContext — mandatory):");
    expect(prompt).toContain("format: checklist");
    expect(prompt).toContain("requires_checklist_items: true");
    expect(prompt).toMatch(/checklist items/i);
  });

  it("handles missing strategy and first section with blank format", () => {
    const prompt = buildWriterUserPrompt({
      project: {
        title: "Ebook",
        audience: "A",
        tone: "t",
        niche: "n",
      },
      format_context: resolveFormatContext({
        ebookType: "lead_magnet",
        templateId: null,
      }),
      section: {
        title: "Only",
        summary: "S",
        key_points: ["k1", "k2"],
      },
    });
    expect(prompt).toContain("Strategy: (not available");
    expect(prompt).toContain("previous: (none");
    expect(prompt).toContain("format: blank");
  });

  it("Checklist Writer prompt differs from Workbook", () => {
    const base = {
      project: {
        title: "Ebook",
        audience: "A",
        tone: "practical",
        niche: "growth",
        ebook_type: "lead_magnet" as const,
      },
      strategy,
      section: {
        title: "Do the work",
        summary: "Practical section",
        key_points: ["Step one clearly", "Step two clearly"],
        estimated_words: 500,
      },
    };

    const checklist = buildWriterUserPrompt({
      ...base,
      format_context: checklistFormat,
    });
    const workbook = buildWriterUserPrompt({
      ...base,
      project: { ...base.project, ebook_type: "bonus_product" },
      format_context: workbookFormat,
    });

    expect(checklist).toContain("format: checklist");
    expect(workbook).toContain("format: workbook");
    expect(checklist).toContain("requires_checklist_items: true");
    expect(workbook).toContain("requires_reflection_prompts: true");
    expect(workbook).toMatch(/reflection|exercise|fillable/i);
    expect(checklist).not.toContain("requires_reflection_prompts: true");
  });

  it("Bonus Implementation Guide prompt anchors to offer usage", () => {
    const prompt = buildWriterUserPrompt({
      project: {
        title: "Bonus guide",
        audience: "Buyers",
        tone: "clear",
        niche: "course",
        ebook_type: "bonus_product",
      },
      strategy: {
        ...strategy,
        bonus_role: "implementation_aid",
        usage_moment: "after_purchase",
      },
      format_context: implementationFormat,
      offer_context: {
        link_id: "link_1",
        relationship: "bonus_for",
        source_is_newer: false,
        snapshot: {
          version: 1,
          offer_id: "off_1",
          name: "Main Course",
          offer_type: "course",
          ownership: "owned",
          short_description: null,
          target_audience: null,
          primary_problem: null,
          primary_outcome: "Launch in 30 days",
          niche: null,
          destination_url: "https://example.com",
        },
      },
      section: {
        title: "Setup",
        summary: "Prepare the environment before implementing the parent product.",
        key_points: ["Prerequisites first", "Verify install"],
        estimated_words: 600,
      },
    });

    expect(prompt).toContain("format: implementation_guide");
    expect(prompt).toMatch(/parent Offer|prerequisites|troubleshooting/i);
    expect(prompt).toContain("offer_name: Main Course");
    expect(prompt).toContain("requires_action_steps: true");
  });

  it("Lead Quick Win Guide prompt emphasizes narrow result", () => {
    const prompt = buildWriterUserPrompt({
      project: {
        title: "Quick win",
        audience: "Busy founders",
        tone: "practical",
        niche: "growth",
        ebook_type: "lead_magnet",
      },
      strategy,
      format_context: quickWinFormat,
      section: {
        title: "Get the win",
        summary: "One result in under an hour.",
        key_points: ["Define the win", "Execute the steps"],
        estimated_words: 400,
      },
    });

    expect(prompt).toContain("format: quick_win_guide");
    expect(prompt).toMatch(/15–45 minutes|narrowly defined result|immediate action/i);
    expect(prompt).toContain("requires_action_steps: true");
  });
});
