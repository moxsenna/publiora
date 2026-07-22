import { describe, expect, it, vi } from "vitest";
import {
  PlannerValidationError,
  buildPlannerUserPrompt,
  normalizePlannerResult,
  plannerResponseSchema,
  runPlanner,
  type PlannerInput,
} from "./planner";
import type { OutlineSection } from "@/types/outline";
import { resolveFormatContext } from "@/lib/templates/format-context";
import type { EbookStrategy } from "@/types/strategy";
import * as provider from "@/lib/ai/provider";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const VALID_SUMMARY =
  "This section explains the core idea with enough detail for readers.";

/** Build N minimal valid section stubs for normalize tests. */
function nSections(
  count: number,
  overrides: Array<Record<string, unknown>> = [],
): Array<Record<string, unknown>> {
  return Array.from({ length: count }, (_, i) => ({
    title: `Section title ${i + 1}`,
    summary: VALID_SUMMARY,
    key_points: [`point a for section ${i + 1}`, `point b for section ${i + 1}`],
    estimated_words: 500,
    ...(overrides[i] ?? {}),
  }));
}

function validRaw(count = 5, overrides: Array<Record<string, unknown>> = []) {
  return {
    title: "Nice Outline Title",
    description:
      "A complete outline description that is long enough for validation.",
    sections: nSections(count, overrides),
  };
}

// ---------------------------------------------------------------------------
// plannerResponseSchema — transitional permissive schema still parseable
// ---------------------------------------------------------------------------

describe("plannerResponseSchema", () => {
  it("accepts a valid response", () => {
    expect(() =>
      plannerResponseSchema.parse(validRaw()),
    ).not.toThrow();
  });

  it("accepts incomplete payloads (strict normalize rejects later)", () => {
    expect(() =>
      plannerResponseSchema.parse({ title: "X", sections: [] }),
    ).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// normalizePlannerResult — strict, no substantive fabrication
// ---------------------------------------------------------------------------

describe("normalizePlannerResult", () => {
  const projectTitle = "My Ebook";
  const defaultRange = { min: 4, preferred: 6, max: 8 };

  it("preserves title and description from AI when present", () => {
    const result = normalizePlannerResult(
      projectTitle,
      validRaw(5),
      defaultRange,
    );
    expect(result.title).toBe("Nice Outline Title");
    expect(result.description).toContain("complete outline description");
  });

  it("rejects missing title", () => {
    expect(() =>
      normalizePlannerResult(
        projectTitle,
        {
          description: VALID_SUMMARY + " more text here",
          sections: nSections(5),
        },
        defaultRange,
      ),
    ).toThrow(PlannerValidationError);
  });

  it("rejects missing summary on a section", () => {
    expect(() =>
      normalizePlannerResult(
        projectTitle,
        validRaw(5, [{ summary: "too short" }]),
        defaultRange,
      ),
    ).toThrow(PlannerValidationError);
  });

  it("rejects one key point (no Cover/Expand pad)", () => {
    expect(() =>
      normalizePlannerResult(
        projectTitle,
        validRaw(5, [
          {
            key_points: ["only one solid key point here"],
          },
        ]),
        defaultRange,
      ),
    ).toThrow(PlannerValidationError);

    try {
      normalizePlannerResult(
        projectTitle,
        validRaw(5, [{ key_points: ["only one solid key point here"] }]),
        defaultRange,
      );
    } catch (err) {
      expect(err).toBeInstanceOf(PlannerValidationError);
      const msg = JSON.stringify((err as PlannerValidationError).issues);
      expect(msg).not.toMatch(/Cover:|Expand:|Key point \d/);
    }
  });

  it("rejects empty sections", () => {
    expect(() =>
      normalizePlannerResult(
        projectTitle,
        {
          title: "Title here",
          description: VALID_SUMMARY + " outline level",
          sections: [],
        },
        defaultRange,
      ),
    ).toThrow(PlannerValidationError);
  });

  it("rejects too few sections for range", () => {
    try {
      normalizePlannerResult(projectTitle, validRaw(3), {
        min: 4,
        preferred: 6,
        max: 8,
      });
      expect.unreachable("should throw");
    } catch (err) {
      expect(err).toBeInstanceOf(PlannerValidationError);
      const issues = (err as PlannerValidationError).issues;
      expect(issues.some((i) => i.code === "too_few_sections")).toBe(true);
    }
  });

  it("rejects too many sections for range", () => {
    try {
      normalizePlannerResult(projectTitle, validRaw(10), {
        min: 4,
        preferred: 6,
        max: 8,
      });
      expect.unreachable("should throw");
    } catch (err) {
      expect(err).toBeInstanceOf(PlannerValidationError);
      const issues = (err as PlannerValidationError).issues;
      expect(issues.some((i) => i.code === "too_many_sections")).toBe(true);
    }
  });

  it("accepts section count inside range", () => {
    const result = normalizePlannerResult(
      projectTitle,
      validRaw(5),
      defaultRange,
    );
    expect(result.sections.length).toBe(5);
  });

  it("preserves stable section IDs from AI", () => {
    const result = normalizePlannerResult(
      projectTitle,
      validRaw(5, [
        { id: "intro-section", title: "Intro section title" },
        { id: "body-section", title: "Body section title" },
      ]),
      defaultRange,
    );
    expect(result.sections[0].id).toBe("intro-section");
    expect(result.sections[1].id).toBe("body-section");
  });

  it("generates technical section IDs when missing", () => {
    const result = normalizePlannerResult(
      projectTitle,
      validRaw(5),
      defaultRange,
    );
    expect(result.sections[0].id).toMatch(/^sec_1_/);
    expect(result.sections[1].id).toMatch(/^sec_2_/);
  });

  it("reassigns position sequentially from 1", () => {
    const result = normalizePlannerResult(
      projectTitle,
      validRaw(5, [
        { position: 42, title: "First section title" },
        { position: 7, title: "Second section title" },
      ]),
      defaultRange,
    );
    expect(result.sections[0].position).toBe(1);
    expect(result.sections[1].position).toBe(2);
    expect(result.sections[4].position).toBe(5);
  });

  it("dedupes key points without inventing new ones", () => {
    const result = normalizePlannerResult(
      projectTitle,
      validRaw(5, [
        {
          key_points: [
            "Actionable checklist item one",
            "Actionable checklist item one",
            "Second distinct key point",
          ],
        },
      ]),
      defaultRange,
    );
    expect(result.sections[0].key_points).toEqual([
      "Actionable checklist item one",
      "Second distinct key point",
    ]);
  });

  it("never fabricates Cover/Expand/Key point N fallbacks", () => {
    expect(() =>
      normalizePlannerResult(
        projectTitle,
        validRaw(5, [{ key_points: [] }]),
        defaultRange,
      ),
    ).toThrow(PlannerValidationError);

    expect(() =>
      normalizePlannerResult(
        projectTitle,
        validRaw(5, [{ title: "ab" }]),
        defaultRange,
      ),
    ).toThrow(PlannerValidationError);
  });

  it("clamps estimated_words into provided technical range", () => {
    // Values must pass schema (150–3000) then clamp to tighter technical range.
    const result = normalizePlannerResult(
      projectTitle,
      validRaw(5, [
        { estimated_words: 200 },
        { estimated_words: 2500 },
        { estimated_words: 500 },
      ]),
      defaultRange,
      { min: 300, max: 1200, preferred: 700 },
    );
    expect(result.sections[0].estimated_words).toBe(300);
    expect(result.sections[1].estimated_words).toBe(1200);
    expect(result.sections[2].estimated_words).toBe(500);
  });

  it("forces status to pending", () => {
    const result = normalizePlannerResult(
      projectTitle,
      validRaw(5, [{ status: "generated" }]),
      defaultRange,
    );
    expect(result.sections[0].status).toBe("pending");
  });

  it("returns PlannerResult shape", () => {
    const result = normalizePlannerResult(
      projectTitle,
      validRaw(5),
      defaultRange,
    );
    expect(typeof result.title).toBe("string");
    expect(typeof result.description).toBe("string");
    expect(Array.isArray(result.sections)).toBe(true);
    const s: OutlineSection = result.sections[0];
    expect(typeof s.id).toBe("string");
    expect(typeof s.position).toBe("number");
    expect(typeof s.title).toBe("string");
    expect(typeof s.summary).toBe("string");
    expect(Array.isArray(s.key_points)).toBe(true);
    expect(s.key_points.length).toBeGreaterThanOrEqual(2);
    expect(typeof s.estimated_words).toBe("number");
    expect(s.status).toBe("pending");
  });
});

// ---------------------------------------------------------------------------
// buildPlannerUserPrompt — FormatContext
// ---------------------------------------------------------------------------

const baseStrategy: EbookStrategy = {
  topic: "Content systems",
  audience: "Founders",
  audience_sophistication: "intermediate",
  primary_problem: "Inconsistent publishing",
  desired_outcome: "Ship weekly content",
  core_promise: "A repeatable content engine",
  unique_angle: "Systems over inspiration",
  tone: "practical",
  product_or_offer: null,
  funnel_goal: null,
  cta_goal: null,
  traffic_source: null,
  bonus_role: null,
  usage_moment: null,
  sales_positioning: null,
  buyer_objections: [],
  content_pillars: ["planning", "production"],
  pain_points: ["overwhelm"],
};

function basePlannerInput(overrides: Partial<PlannerInput> = {}): PlannerInput {
  return {
    project: {
      title: "Content Engine",
      subtitle: null,
      description: "Build a content system",
      audience: "Founders",
      niche: "Marketing",
      tone: "practical",
      ebook_type: "lead_magnet",
    },
    strategy: baseStrategy,
    readinessScore: 90,
    offer_context: null,
    format_context: resolveFormatContext({
      ebookType: "lead_magnet",
      templateId: "tpl_checklist",
    }),
    ...overrides,
  };
}

describe("buildPlannerUserPrompt", () => {
  it("includes FormatContext rules and checklist-oriented structure", () => {
    const prompt = buildPlannerUserPrompt(basePlannerInput());
    expect(prompt).toContain("Selected format (FormatContext — mandatory):");
    expect(prompt).toContain("format: checklist");
    expect(prompt).toContain("section_range: min=4 preferred=6 max=9");
    expect(prompt).toMatch(/checklist items/i);
    expect(prompt).toContain("requires_checklist_items: true");
    expect(prompt).toContain("Build 4-9 flat sections");
    expect(prompt).toContain("core_promise: A repeatable content engine");
    expect(prompt).toContain("Offer relationship context: (none)");
  });

  it("materially differs for workbook vs checklist", () => {
    const checklist = buildPlannerUserPrompt(basePlannerInput());
    const workbook = buildPlannerUserPrompt(
      basePlannerInput({
        project: {
          title: "Content Engine",
          subtitle: null,
          description: "Build a content system",
          audience: "Founders",
          niche: "Marketing",
          tone: "practical",
          ebook_type: "bonus_product",
        },
        format_context: resolveFormatContext({
          ebookType: "bonus_product",
          templateId: "tpl_workbook",
        }),
      }),
    );

    expect(checklist).toContain("format: checklist");
    expect(workbook).toContain("format: workbook");
    expect(workbook).toMatch(/reflection|exercise|fillable/i);
    expect(workbook).toContain("requires_reflection_prompts: true");
    expect(checklist).not.toContain("requires_reflection_prompts: true");
  });

  it("uses type/format section bounds for sellable playbook", () => {
    const prompt = buildPlannerUserPrompt(
      basePlannerInput({
        project: {
          title: "Deep Playbook",
          subtitle: null,
          description: "Deep system",
          audience: "Marketers",
          niche: "Growth",
          tone: "tactical",
          ebook_type: "sellable_ebook",
        },
        format_context: resolveFormatContext({
          ebookType: "sellable_ebook",
          templateId: "tpl_playbook",
        }),
      }),
    );
    expect(prompt).toContain("format: playbook");
    expect(prompt).toContain("section_range: min=6 preferred=8 max=12");
    expect(prompt).toContain("Build 6-12 flat sections");
    expect(prompt).toMatch(/phases/i);
  });
});

// ---------------------------------------------------------------------------
// runPlanner repair loop
// ---------------------------------------------------------------------------

describe("runPlanner repair", () => {
  it("repairs once then succeeds", async () => {
    const good = validRaw(5);
    const bad = {
      title: "Bad",
      description: "short",
      sections: nSections(2),
    };

    const spy = vi
      .spyOn(provider, "completeJson")
      .mockResolvedValueOnce(bad)
      .mockResolvedValueOnce(good);

    const result = await runPlanner(basePlannerInput());
    expect(result.sections.length).toBe(5);
    expect(spy).toHaveBeenCalledTimes(2);
    const repairUser = spy.mock.calls[1][0].user as string;
    expect(repairUser).toMatch(/failed validation/i);

    spy.mockRestore();
  });

  it("fails after repair still invalid", async () => {
    const bad = {
      title: "Bad",
      description: "short",
      sections: nSections(1),
    };
    const spy = vi
      .spyOn(provider, "completeJson")
      .mockResolvedValueOnce(bad)
      .mockResolvedValueOnce(bad);

    await expect(runPlanner(basePlannerInput())).rejects.toBeInstanceOf(
      PlannerValidationError,
    );
    expect(spy).toHaveBeenCalledTimes(2);
    spy.mockRestore();
  });
});
