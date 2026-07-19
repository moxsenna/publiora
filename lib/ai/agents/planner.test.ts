import { describe, expect, it } from "vitest";
import { normalizePlannerResult, plannerResponseSchema } from "./planner";
import type { OutlineSection } from "@/types/outline";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Build N minimal valid section stubs for normalize tests. */
function nSections(
  count: number,
  overrides: Array<Record<string, unknown>> = [],
): Array<Record<string, unknown>> {
  return Array.from({ length: count }, (_, i) => ({
    title: `Section ${i + 1}`,
    key_points: [`point a ${i + 1}`, `point b ${i + 1}`],
    ...(overrides[i] ?? {}),
  }));
}

// ---------------------------------------------------------------------------
// plannerResponseSchema validation — permissive; normalization handles cleanup
// ---------------------------------------------------------------------------

describe("plannerResponseSchema", () => {
  it("accepts a valid response", () => {
    const raw = {
      title: "My Outline",
      description: "A great outline",
      sections: [
        {
          id: "s1",
          position: 1,
          title: "Introduction",
          summary: "Welcome",
          key_points: ["point a", "point b"],
          estimated_words: 500,
          status: "pending",
        },
      ],
    };
    expect(() => plannerResponseSchema.parse(raw)).not.toThrow();
  });

  it("accepts empty sections (normalization catches later)", () => {
    const raw = { title: "X", sections: [] };
    expect(() => plannerResponseSchema.parse(raw)).not.toThrow();
  });

  it("accepts section with empty title (normalization fixes)", () => {
    const raw = {
      sections: [{ id: "x", title: "" }],
    };
    expect(() => plannerResponseSchema.parse(raw)).not.toThrow();
  });

  it("accepts minimal sections (just title)", () => {
    const raw = {
      sections: [{ title: "Only Title" }],
    };
    expect(() => plannerResponseSchema.parse(raw)).not.toThrow();
  });

  it("accepts up to 10 sections", () => {
    const sections = Array.from({ length: 10 }, (_, i) => ({
      title: `Section ${i + 1}`,
    }));
    expect(() => plannerResponseSchema.parse({ sections })).not.toThrow();
  });

  it("accepts junk values (invalid enum — normalization cleans up)", () => {
    const raw = {
      sections: [
        {
          title: "A",
          estimated_words: -5,
          key_points: [""],
          status: "generated",
        },
      ],
    };
    expect(() => plannerResponseSchema.parse(raw)).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// normalizePlannerResult
// ---------------------------------------------------------------------------

describe("normalizePlannerResult", () => {
  const projectTitle = "My Ebook";

  it("preserves title and description from AI when present", () => {
    const result = normalizePlannerResult(projectTitle, {
      title: "Nice Title",
      description: "A description",
      sections: nSections(5),
    });
    expect(result.title).toBe("Nice Title");
    expect(result.description).toBe("A description");
  });

  it("falls back to project title when AI title is missing", () => {
    const result = normalizePlannerResult(projectTitle, {
      sections: nSections(5),
    });
    expect(result.title).toBe(projectTitle);
    expect(result.description).toBe("");
  });

  it("throws when sections array is empty", () => {
    expect(() =>
      normalizePlannerResult(projectTitle, { title: "X", sections: [] }),
    ).toThrow("Planner returned no sections");
  });

  it("throws when sections is missing entirely", () => {
    expect(() =>
      normalizePlannerResult(projectTitle, { title: "X" }),
    ).toThrow("Planner returned no sections");
  });

  it("throws when fewer than 5 sections after cap", () => {
    expect(() =>
      normalizePlannerResult(projectTitle, {
        sections: nSections(4),
      }),
    ).toThrow(/need 5-10/);
  });

  it("throws for 1 section", () => {
    expect(() =>
      normalizePlannerResult(projectTitle, {
        sections: [{ title: "Only" }],
      }),
    ).toThrow(/need 5-10/);
  });

  it("accepts exactly 5 sections", () => {
    const result = normalizePlannerResult(projectTitle, {
      sections: nSections(5),
    });
    expect(result.sections.length).toBe(5);
  });

  it("limits sections to 10", () => {
    const sections = Array.from({ length: 15 }, (_, i) => ({
      title: `Section ${i + 1}`,
      key_points: ["a", "b"],
    }));
    const result = normalizePlannerResult(projectTitle, { sections });
    expect(result.sections.length).toBe(10);
  });

  it("preserves stable section IDs from AI", () => {
    const result = normalizePlannerResult(projectTitle, {
      title: "T",
      sections: nSections(5, [
        { id: "intro-section", title: "Intro" },
        { id: "body-section", title: "Body" },
      ]),
    });
    expect(result.sections[0].id).toBe("intro-section");
    expect(result.sections[1].id).toBe("body-section");
  });

  it("generates section IDs when missing", () => {
    const result = normalizePlannerResult(projectTitle, {
      title: "T",
      sections: nSections(5),
    });
    expect(result.sections[0].id).toMatch(/^sec_1_/);
    expect(result.sections[1].id).toMatch(/^sec_2_/);
  });

  it("reassigns position sequentially from 1", () => {
    const result = normalizePlannerResult(projectTitle, {
      title: "T",
      sections: nSections(5, [
        { id: "a", position: 42, title: "First" },
        { id: "b", position: 7, title: "Second" },
      ]),
    });
    expect(result.sections[0].position).toBe(1);
    expect(result.sections[1].position).toBe(2);
    expect(result.sections[4].position).toBe(5);
  });

  it("falls back to 'Section N' when title is empty", () => {
    const result = normalizePlannerResult(projectTitle, {
      title: "T",
      sections: nSections(5, [{ title: "" }, { title: "   " }]),
    });
    expect(result.sections[0].title).toBe("Section 1");
    expect(result.sections[1].title).toBe("Section 2");
  });

  it("defaults summary to empty string", () => {
    const result = normalizePlannerResult(projectTitle, {
      title: "T",
      sections: nSections(5),
    });
    expect(result.sections[0].summary).toBe("");
  });

  it("limits key_points to 5 and filters blanks", () => {
    const result = normalizePlannerResult(projectTitle, {
      title: "T",
      sections: nSections(5, [
        {
          title: "A",
          key_points: ["a", "", "b", "c", "d", "e", "f", "  "],
        },
      ]),
    });
    expect(result.sections[0].key_points).toEqual(["a", "b", "c", "d", "e"]);
    expect(result.sections[0].key_points.length).toBeGreaterThanOrEqual(2);
    expect(result.sections[0].key_points.length).toBeLessThanOrEqual(5);
  });

  it("pads key_points to at least 2 when missing", () => {
    const result = normalizePlannerResult(projectTitle, {
      title: "T",
      sections: nSections(5, [{ title: "Intro", key_points: undefined }]),
    });
    expect(result.sections[0].key_points.length).toBeGreaterThanOrEqual(2);
    expect(result.sections[0].key_points.length).toBeLessThanOrEqual(5);
    expect(result.sections[0].key_points[0]).toBe("Cover: Intro");
  });

  it("pads key_points when only one valid point", () => {
    const result = normalizePlannerResult(projectTitle, {
      title: "T",
      sections: nSections(5, [
        {
          title: "Deep Dive",
          summary: "First sentence. Second sentence.",
          key_points: ["only one"],
        },
      ]),
    });
    expect(result.sections[0].key_points.length).toBe(2);
    expect(result.sections[0].key_points[0]).toBe("only one");
    expect(result.sections[0].key_points[1]).toBe("Cover: Deep Dive");
  });

  it("every section ends with 2-5 key_points", () => {
    const result = normalizePlannerResult(projectTitle, {
      title: "T",
      sections: nSections(5, [
        { title: "A", key_points: [] },
        { title: "B", key_points: ["one"] },
        { title: "C", key_points: ["a", "b", "c"] },
        { title: "D", key_points: ["", "  "] },
        {
          title: "E",
          key_points: ["1", "2", "3", "4", "5", "6"],
        },
      ]),
    });
    for (const s of result.sections) {
      expect(s.key_points.length).toBeGreaterThanOrEqual(2);
      expect(s.key_points.length).toBeLessThanOrEqual(5);
    }
  });

  it("clamps estimated_words to [300, 1200]", () => {
    const result = normalizePlannerResult(projectTitle, {
      title: "T",
      sections: nSections(5, [
        { title: "A", estimated_words: 50 },
        { title: "B", estimated_words: 3000 },
        { title: "C", estimated_words: 500 },
      ]),
    });
    expect(result.sections[0].estimated_words).toBe(300); // clamped up from 50
    expect(result.sections[1].estimated_words).toBe(1200); // clamped down from 3000
    expect(result.sections[2].estimated_words).toBe(500); // preserved
  });

  it("defaults estimated_words to 700 when missing", () => {
    const result = normalizePlannerResult(projectTitle, {
      title: "T",
      sections: nSections(5),
    });
    expect(result.sections[0].estimated_words).toBe(700);
  });

  it("clamps 0 to 300 (not default 700 because it is finite)", () => {
    const result = normalizePlannerResult(projectTitle, {
      title: "T",
      sections: nSections(5, [{ title: "A", estimated_words: 0 }]),
    });
    // 0 is finite, so clampWords clamps to min=300
    expect(result.sections[0].estimated_words).toBe(300);
  });

  it("all statuses are forced to 'pending'", () => {
    const result = normalizePlannerResult(projectTitle, {
      title: "T",
      sections: nSections(5, [{ title: "A", status: "generated" }]),
    });
    expect(result.sections[0].status).toBe("pending");
  });

  it("handles very low estimated_words gracefully", () => {
    const result = normalizePlannerResult(projectTitle, {
      title: "T",
      sections: nSections(5, [{ title: "A", estimated_words: -50 }]),
    });
    expect(result.sections[0].estimated_words).toBe(300);
    expect(Number.isFinite(result.sections[0].estimated_words)).toBe(true);
  });

  it("handles undefined key_points by padding", () => {
    const result = normalizePlannerResult(projectTitle, {
      title: "T",
      sections: nSections(5, [
        { title: "A", key_points: undefined },
        { title: "C", key_points: ["valid", "also"] },
      ]),
    });
    expect(result.sections[0].key_points.length).toBeGreaterThanOrEqual(2);
    expect(result.sections[1].key_points).toEqual(["valid", "also"]);
  });

  it("result returns exactly the PlannerResult shape", () => {
    const result = normalizePlannerResult(projectTitle, {
      title: "T",
      description: "D",
      sections: nSections(5, [
        { title: "Intro", summary: "Summary here" },
      ]),
    });
    expect(typeof result.title).toBe("string");
    expect(typeof result.description).toBe("string");
    expect(Array.isArray(result.sections)).toBe(true);
    expect(result.sections.length).toBeGreaterThanOrEqual(5);
    expect(result.sections.length).toBeLessThanOrEqual(10);
    const s: OutlineSection = result.sections[0];
    expect(typeof s.id).toBe("string");
    expect(typeof s.position).toBe("number");
    expect(typeof s.title).toBe("string");
    expect(typeof s.summary).toBe("string");
    expect(Array.isArray(s.key_points)).toBe(true);
    expect(s.key_points.length).toBeGreaterThanOrEqual(2);
    expect(s.key_points.length).toBeLessThanOrEqual(5);
    expect(typeof s.estimated_words).toBe("number");
    expect(s.status).toBe("pending");
  });
});
