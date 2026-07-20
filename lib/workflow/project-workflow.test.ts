import { describe, expect, it } from "vitest";
import {
  deriveProjectWorkflow,
  checkStrategyComplete,
  checkOutlineComplete,
  stripHtml,
  isValidUrl,
  countValidOutlineSections,
  isStrategyReady,
  getStrategyBlockers,
  parseWorkflowStep,
} from "@/lib/workflow/project-workflow";
import type { Project } from "@/types/project";
import type { Section } from "@/types/section";
import type { Outline, OutlineSection } from "@/types/outline";
import type { ProjectStateV2, EbookStrategy } from "@/types/strategy";
import type {
  ProjectWorkflowStep,
  WorkflowStepStatus,
  ProjectWorkflowState,
} from "@/types/workflow";

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

function makeOutlineSection(
  overrides: Partial<OutlineSection> = {},
): OutlineSection {
  return {
    id: overrides.id ?? "os-1",
    position: overrides.position ?? 1,
    title: overrides.title ?? "Introduction",
    summary: overrides.summary ?? "A brief introduction.",
    key_points: overrides.key_points ?? ["point 1"],
    estimated_words: overrides.estimated_words ?? 500,
    status: overrides.status ?? "pending",
  };
}

function makeSection(
  overrides: Partial<Section> = {},
): Section {
  return {
    id: overrides.id ?? "sec-1",
    project_id: overrides.project_id ?? "proj-1",
    outline_section_id: overrides.outline_section_id ?? "os-1",
    position: overrides.position ?? 1,
    title: overrides.title ?? "Introduction",
    content_html: overrides.content_html ?? "<p>Some content here.</p>",
    word_count: overrides.word_count ?? 50,
    status: overrides.status ?? "generated",
    updated_at: overrides.updated_at ?? new Date().toISOString(),
  };
}

function makeProject(overrides: Partial<Project> = {}): Project {
  return {
    id: "proj-1",
    owner_id: "user-1",
    title: "My Great Ebook",
    author: "Author Name",
    subtitle: "A compelling subtitle",
    description: "A description of the ebook.",
    audience: "Developers",
    tone: "professional",
    niche: "tech",
    ebook_type: "lead_magnet",
    status: "draft",
    template_id: null,
    progress: 0,
    sections_generated: 0,
    total_sections: 0,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    published_at: null,
    cover_color: "#000000",
    cta_goal: null,
    final_cta: null,
    cta_url: null,
    ...overrides,
  };
}

function makeFullStrategy(): EbookStrategy {
  return {
    topic: "Scaling Node.js Apps",
    audience: "Senior developers",
    audience_sophistication: "Advanced",
    primary_problem: "Unexpected crashes under load",
    pain_points: ["latency", "memory leaks"],
    desired_outcome: "Stable high-throughput systems",
    core_promise: "A battle-tested playbook",
    unique_angle: "Lessons from 10 production incidents",
    content_pillars: ["monitoring", "resilience"],
    product_or_offer: null,
    funnel_goal: null,
    cta_goal: null,
    tone: "authoritative",
  traffic_source: null,
  bonus_role: null,
  usage_moment: null,
  sales_positioning: null,
  buyer_objections: [],
  };
}

function makeStrategyState(
  overrides: Partial<EbookStrategy> = {},
): ProjectStateV2 {
  return {
    schema_version: 3,
    strategy: { ...makeFullStrategy(), ...overrides },
    missing_fields: [],
    next_action: "create_outline",
    conversation_summary: "Strategy discussion complete.",
    updated_at: new Date().toISOString(),
  };
}

function makeApprovedOutline(
  sectionOverrides: Partial<OutlineSection>[] = [
    {},
    { id: "os-2", position: 2, title: "Setup" },
    { id: "os-3", position: 3, title: "Deployment" },
  ],
): Outline {
  return {
    id: "outline-1",
    project_id: "proj-1",
    title: "Ebook Outline",
    description: "Table of contents",
    sections: sectionOverrides.map((o, i) => makeOutlineSection({ ...o, position: i + 1 })),
    approved: true,
    approved_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

function makeSectionsForOutline(
  outline: Outline,
  overrides: Partial<Section>[] = [],
): Section[] {
  return outline.sections.map((os, i) =>
    makeSection({
      id: `sec-${i + 1}`,
      outline_section_id: os.id,
      position: os.position,
      title: os.title,
      ...(overrides[i] || {}),
    }),
  );
}

// ---------------------------------------------------------------------------
// Utility tests
// ---------------------------------------------------------------------------

describe("stripHtml", () => {
  it("strips HTML tags", () => {
    expect(stripHtml("<p>Hello <b>World</b></p>")).toBe("Hello World");
  });

  it("returns empty string for empty input", () => {
    expect(stripHtml("")).toBe("");
    expect(stripHtml("   ")).toBe("");
  });
});

describe("isValidUrl", () => {
  it("validates http/https URLs", () => {
    expect(isValidUrl("https://example.com")).toBe(true);
    expect(isValidUrl("http://example.com")).toBe(true);
  });

  it("rejects invalid URLs", () => {
    expect(isValidUrl("not-a-url")).toBe(false);
    expect(isValidUrl("ftp://example.com")).toBe(false);
    expect(isValidUrl("")).toBe(false);
  });
});

describe("countValidOutlineSections", () => {
  it("counts sections with non-empty titles", () => {
    const outline = makeApprovedOutline([
      { id: "os-1", title: "A" },
      { id: "os-2", title: "" },
      { id: "os-3", title: "  " },
      { id: "os-4", title: "D" },
    ]);
    expect(countValidOutlineSections(outline)).toBe(2);
  });
});

// ---------------------------------------------------------------------------
// checkStrategyComplete
// ---------------------------------------------------------------------------

describe("checkStrategyComplete", () => {
  it("returns true when readiness >= 70 and all required fields filled", () => {
    const strategy = makeFullStrategy();
    expect(checkStrategyComplete(strategy, 70)).toBe(true);
    expect(checkStrategyComplete(strategy, 100)).toBe(true);
  });

  it("returns false when readiness < 70", () => {
    const strategy = makeFullStrategy();
    expect(checkStrategyComplete(strategy, 69)).toBe(false);
  });

  it("returns false when a required field is null", () => {
    const strategy = makeFullStrategy();
    strategy.topic = null;
    expect(checkStrategyComplete(strategy, 80)).toBe(false);
  });

  it("returns false when a required field is empty string", () => {
    const strategy = makeFullStrategy();
    strategy.audience = "  ";
    expect(checkStrategyComplete(strategy, 80)).toBe(false);
  });

  it("CTA/product null fields do not block strategy", () => {
    const strategy = makeFullStrategy();
    strategy.cta_goal = null;
    strategy.product_or_offer = null;
    strategy.funnel_goal = null;
    expect(checkStrategyComplete(strategy, 80)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// checkOutlineComplete
// ---------------------------------------------------------------------------

describe("checkOutlineComplete", () => {
  it("returns false for null outline", () => {
    expect(checkOutlineComplete(null)).toBe(false);
  });

  it("returns false when not approved", () => {
    const outline = makeApprovedOutline();
    outline.approved = false;
    expect(checkOutlineComplete(outline)).toBe(false);
  });

  it("returns false with fewer than 3 valid sections", () => {
    const outline = makeApprovedOutline([
      { id: "os-1", title: "A" },
      { id: "os-2", title: "B" },
    ]);
    expect(checkOutlineComplete(outline)).toBe(false);
  });

  it("returns true when approved and >= 3 valid sections", () => {
    const outline = makeApprovedOutline();
    expect(checkOutlineComplete(outline)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// deriveProjectWorkflow — stage selection
// ---------------------------------------------------------------------------

describe("deriveProjectWorkflow - stage selection", () => {
  const emptySections: Section[] = [];

  it("recommends strategy when strategy incomplete (readiness < 70)", () => {
    const state = deriveProjectWorkflow({
      project: makeProject(),
      strategyState: makeStrategyState({ topic: null }), // missing field
      readinessScore: 60,
      outline: null,
      sections: emptySections,
    });
    expect(state.recommendedStep).toBe("strategy");
  });

  it("recommends strategy when readiness is below 70", () => {
    const state = deriveProjectWorkflow({
      project: makeProject(),
      strategyState: makeStrategyState(),
      readinessScore: 50,
      outline: null,
      sections: emptySections,
    });
    expect(state.recommendedStep).toBe("strategy");
  });

  it("recommends outline when strategy complete but no outline", () => {
    const state = deriveProjectWorkflow({
      project: makeProject(),
      strategyState: makeStrategyState(),
      readinessScore: 85,
      outline: null,
      sections: emptySections,
    });
    expect(state.recommendedStep).toBe("outline");
  });

  it("recommends outline when outline exists but not approved", () => {
    const outline = makeApprovedOutline();
    outline.approved = false;
    const state = deriveProjectWorkflow({
      project: makeProject(),
      strategyState: makeStrategyState(),
      readinessScore: 85,
      outline,
      sections: emptySections,
    });
    expect(state.recommendedStep).toBe("outline");
  });

  it("recommends write when outline approved, sections not done", () => {
    const outline = makeApprovedOutline();
    const state = deriveProjectWorkflow({
      project: makeProject(),
      strategyState: makeStrategyState(),
      readinessScore: 85,
      outline,
      sections: emptySections,
    });
    expect(state.recommendedStep).toBe("write");
  });

  it("recommends review when write complete with warnings", () => {
    const outline = makeApprovedOutline();
    const sections = makeSectionsForOutline(outline);
    const project = makeProject({ subtitle: null }); // triggers subtitle warning
    const state = deriveProjectWorkflow({
      project,
      strategyState: makeStrategyState(),
      readinessScore: 85,
      outline,
      sections,
    });
    // write should be complete, but subtitle warning puts us in review
    expect(state.recommendedStep).toBe("review");
  });

  it("recommends publish when everything is ready", () => {
    const outline = makeApprovedOutline();
    const sections = makeSectionsForOutline(outline);
    const project = makeProject({
      cta_goal: "visit_product",
      final_cta: "Click here",
      cta_url: "https://example.com",
    });
    const state = deriveProjectWorkflow({
      project,
      strategyState: makeStrategyState(),
      readinessScore: 85,
      outline,
      sections,
    });
    expect(state.recommendedStep).toBe("publish");
    expect(state.canPublish).toBe(true);
  });

  it("published legacy project opens in publish", () => {
    const project = makeProject({ status: "published" });
    const state = deriveProjectWorkflow({
      project,
      strategyState: makeStrategyState(),
      readinessScore: 85,
      outline: null,
      sections: emptySections,
    });
    expect(state.recommendedStep).toBe("publish");
    // All steps complete when published
    expect(state.steps.publish).toBe("current");
  });
});

// ---------------------------------------------------------------------------
// deriveProjectWorkflow — blockers
// ---------------------------------------------------------------------------

describe("deriveProjectWorkflow - blockers and warnings", () => {
  it("strategy incomplete adds blocker for outline target", () => {
    const state = deriveProjectWorkflow({
      project: makeProject(),
      strategyState: makeStrategyState({ topic: null }),
      readinessScore: 60,
      outline: null,
      sections: [],
    });
    expect(state.blockers.some((b) => b.code === "strategy_incomplete")).toBe(true);
  });

  it("outline not approved adds blocker", () => {
    const outline = makeApprovedOutline();
    outline.approved = false;
    const state = deriveProjectWorkflow({
      project: makeProject(),
      strategyState: makeStrategyState(),
      readinessScore: 85,
      outline,
      sections: [],
    });
    expect(state.blockers.some((b) => b.code === "outline_not_approved")).toBe(true);
  });

  it("missing outline adds blocker", () => {
    const state = deriveProjectWorkflow({
      project: makeProject(),
      strategyState: makeStrategyState(),
      readinessScore: 85,
      outline: null,
      sections: [],
    });
    expect(state.blockers.some((b) => b.code === "outline_missing")).toBe(true);
  });

  it("missing section adds blocker", () => {
    const outline = makeApprovedOutline();
    // Only provide 1 section for 3 outline sections
    const sections = [makeSection({ id: "sec-1", outline_section_id: "os-1", status: "generated" })];
    const state = deriveProjectWorkflow({
      project: makeProject(),
      strategyState: makeStrategyState(),
      readinessScore: 85,
      outline,
      sections,
    });
    expect(state.blockers.some((b) => b.code.startsWith("missing_section_"))).toBe(true);
  });

  it("empty section content adds blocker", () => {
    const outline = makeApprovedOutline();
    const sections = makeSectionsForOutline(outline, [
      { content_html: "  " },
      { content_html: "<p></p>" },
      {},
    ]);
    const state = deriveProjectWorkflow({
      project: makeProject(),
      strategyState: makeStrategyState(),
      readinessScore: 85,
      outline,
      sections,
    });
    // First section has empty content
    expect(state.blockers.some((b) => b.code.startsWith("empty_section_"))).toBe(true);
  });

  it("failed section adds blocker", () => {
    const outline = makeApprovedOutline();
    const sections = makeSectionsForOutline(outline, [
      { id: "sec-1", outline_section_id: "os-1", status: "failed", content_html: "<p>x</p>" },
      {},
      {},
    ]);
    const state = deriveProjectWorkflow({
      project: makeProject(),
      strategyState: makeStrategyState(),
      readinessScore: 85,
      outline,
      sections,
    });
    expect(state.blockers.some((b) => b.code.startsWith("failed_section_"))).toBe(true);
  });

  it("title empty adds blocker", () => {
    const outline = makeApprovedOutline();
    const sections = makeSectionsForOutline(outline);
    const state = deriveProjectWorkflow({
      project: makeProject({ title: "" }),
      strategyState: makeStrategyState(),
      readinessScore: 85,
      outline,
      sections,
    });
    expect(state.blockers.some((b) => b.code === "title_empty")).toBe(true);
    expect(state.canPublish).toBe(false);
  });

  it("subtitle empty adds warning not blocker", () => {
    const outline = makeApprovedOutline();
    const sections = makeSectionsForOutline(outline);
    const state = deriveProjectWorkflow({
      project: makeProject({ subtitle: null }),
      strategyState: makeStrategyState(),
      readinessScore: 85,
      outline,
      sections,
    });
    const subtitleCheck = state.checks.find((c) => c.id === "subtitle_empty");
    expect(subtitleCheck).toBeDefined();
    expect(subtitleCheck!.severity).toBe("warning");
  });

  it("duplicate section title adds warning", () => {
    const outline = makeApprovedOutline();
    const sections = makeSectionsForOutline(outline, [
      { title: "Same Title", content_html: "<p>A</p>" },
      { title: "Same Title", content_html: "<p>B</p>" },
      { title: "Different", content_html: "<p>C</p>" },
    ]);
    const state = deriveProjectWorkflow({
      project: makeProject(),
      strategyState: makeStrategyState(),
      readinessScore: 85,
      outline,
      sections,
    });
    const dupCheck = state.checks.find(
      (c) => c.id.startsWith("duplicate_title_"),
    );
    expect(dupCheck).toBeDefined();
    expect(dupCheck!.severity).toBe("warning");
  });

  it("section much shorter than median adds warning", () => {
    const outline = makeApprovedOutline([
      { id: "os-1", title: "A" },
      { id: "os-2", title: "B" },
      { id: "os-3", title: "C" },
      { id: "os-4", title: "D" },
      { id: "os-5", title: "E" },
    ]);
    const sections = makeSectionsForOutline(outline, [
      { outline_section_id: "os-1", word_count: 500 },
      { outline_section_id: "os-2", word_count: 480 },
      { outline_section_id: "os-3", word_count: 10 }, // much shorter
      { outline_section_id: "os-4", word_count: 520 },
      { outline_section_id: "os-5", word_count: 490 },
    ]);
    const state = deriveProjectWorkflow({
      project: makeProject(),
      strategyState: makeStrategyState(),
      readinessScore: 85,
      outline,
      sections,
    });
    const shortCheck = state.checks.find(
      (c) => c.id.startsWith("short_section_"),
    );
    expect(shortCheck).toBeDefined();
    expect(shortCheck!.severity).toBe("warning");
  });

  it("no CTA configured adds warning", () => {
    const outline = makeApprovedOutline();
    const sections = makeSectionsForOutline(outline);
    const state = deriveProjectWorkflow({
      project: makeProject({ cta_goal: null }),
      strategyState: makeStrategyState(),
      readinessScore: 85,
      outline,
      sections,
    });
    const ctaCheck = state.checks.find((c) => c.id === "no_cta_configured");
    expect(ctaCheck).toBeDefined();
    expect(ctaCheck!.severity).toBe("warning");
  });
});

// ---------------------------------------------------------------------------
// deriveProjectWorkflow — CTA URL rules
// ---------------------------------------------------------------------------

describe("deriveProjectWorkflow - CTA URL rules", () => {
  const outline = makeApprovedOutline();
  const sections = makeSectionsForOutline(outline);

  it("CTA goal selected but CTA text empty adds blocker", () => {
    const state = deriveProjectWorkflow({
      project: makeProject({ cta_goal: "visit_product", final_cta: null, cta_url: "https://example.com" }),
      strategyState: makeStrategyState(),
      readinessScore: 85,
      outline,
      sections,
    });
    expect(state.blockers.some((b) => b.code === "cta_text_empty")).toBe(true);
  });

  it("URL-required CTA with missing URL adds blocker (visit_product)", () => {
    const state = deriveProjectWorkflow({
      project: makeProject({ cta_goal: "visit_product", final_cta: "Click here", cta_url: null }),
      strategyState: makeStrategyState(),
      readinessScore: 85,
      outline,
      sections,
    });
    expect(state.blockers.some((b) => b.code === "cta_url_missing_or_invalid")).toBe(true);
  });

  it("URL-required CTA with invalid URL adds blocker (buy_product)", () => {
    const state = deriveProjectWorkflow({
      project: makeProject({ cta_goal: "buy_product", final_cta: "Buy now", cta_url: "not-a-url" }),
      strategyState: makeStrategyState(),
      readinessScore: 85,
      outline,
      sections,
    });
    expect(state.blockers.some((b) => b.code === "cta_url_missing_or_invalid")).toBe(true);
  });

  it("URL-required CTA (join_whatsapp) with valid URL passes", () => {
    const state = deriveProjectWorkflow({
      project: makeProject({ cta_goal: "join_whatsapp", final_cta: "Join group", cta_url: "https://chat.whatsapp.com/invite" }),
      strategyState: makeStrategyState(),
      readinessScore: 85,
      outline,
      sections,
    });
    expect(
      state.blockers.some((b) =>
        ["cta_url_missing_or_invalid", "cta_text_empty"].includes(b.code),
      ),
    ).toBe(false);
  });

  it("URL-required CTA (claim_bonus) with valid URL passes", () => {
    const state = deriveProjectWorkflow({
      project: makeProject({ cta_goal: "claim_bonus", final_cta: "Claim", cta_url: "https://example.com/bonus" }),
      strategyState: makeStrategyState(),
      readinessScore: 85,
      outline,
      sections,
    });
    expect(
      state.blockers.some((b) =>
        ["cta_url_missing_or_invalid", "cta_text_empty"].includes(b.code),
      ),
    ).toBe(false);
  });

  it("follow_creator requires URL", () => {
    const state = deriveProjectWorkflow({
      project: makeProject({ cta_goal: "follow_creator", final_cta: "Follow me", cta_url: null }),
      strategyState: makeStrategyState(),
      readinessScore: 85,
      outline,
      sections,
    });
    expect(state.blockers.some((b) => b.code === "cta_url_missing_or_invalid")).toBe(true);
  });

  it("custom CTA without URL is allowed", () => {
    const state = deriveProjectWorkflow({
      project: makeProject({ cta_goal: "custom", final_cta: "Contact us", cta_url: null }),
      strategyState: makeStrategyState(),
      readinessScore: 85,
      outline,
      sections,
    });
    // No URL blocker for custom when URL is null
    expect(state.blockers.some((b) => b.code === "cta_url_missing_or_invalid")).toBe(false);
    expect(state.blockers.some((b) => b.code === "cta_url_invalid")).toBe(false);
  });

  it("custom CTA with invalid URL when provided adds blocker", () => {
    const state = deriveProjectWorkflow({
      project: makeProject({ cta_goal: "custom", final_cta: "Contact us", cta_url: "not-valid" }),
      strategyState: makeStrategyState(),
      readinessScore: 85,
      outline,
      sections,
    });
    expect(state.blockers.some((b) => b.code === "cta_url_invalid")).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// deriveProjectWorkflow — step statuses
// ---------------------------------------------------------------------------

describe("deriveProjectWorkflow - step statuses", () => {
  const emptySections: Section[] = [];

  it("strategy step is current when incomplete", () => {
    const state = deriveProjectWorkflow({
      project: makeProject(),
      strategyState: makeStrategyState({ topic: null }),
      readinessScore: 60,
      outline: null,
      sections: emptySections,
    });
    expect(state.steps.strategy).toBe("current");
    expect(state.steps.outline).toBe("blocked");
  });

  it("outline step is current when strategy complete, no outline", () => {
    const state = deriveProjectWorkflow({
      project: makeProject(),
      strategyState: makeStrategyState(),
      readinessScore: 85,
      outline: null,
      sections: emptySections,
    });
    expect(state.steps.strategy).toBe("complete");
    expect(state.steps.outline).toBe("current");
    expect(state.steps.write).toBe("blocked");
  });

  it("write step is current when outline approved, sections not done", () => {
    const outline = makeApprovedOutline();
    const state = deriveProjectWorkflow({
      project: makeProject(),
      strategyState: makeStrategyState(),
      readinessScore: 85,
      outline,
      sections: [],
    });
    expect(state.steps.strategy).toBe("complete");
    expect(state.steps.outline).toBe("complete");
    expect(state.steps.write).toBe("current");
    expect(state.steps.review).toBe("blocked");
  });

  it("review step is needs_attention when write complete with warnings", () => {
    const outline = makeApprovedOutline();
    const sections = makeSectionsForOutline(outline);
    const project = makeProject({ subtitle: null, cta_goal: null });
    const state = deriveProjectWorkflow({
      project,
      strategyState: makeStrategyState(),
      readinessScore: 85,
      outline,
      sections,
    });
    expect(state.steps.strategy).toBe("complete");
    expect(state.steps.outline).toBe("complete");
    expect(state.steps.write).toBe("complete");
    // Review has warnings (subtitle, no CTA) -> needs_attention
    expect(state.steps.review).toBe("needs_attention");
  });

  it("publish step is current when everything is ready", () => {
    const outline = makeApprovedOutline();
    const sections = makeSectionsForOutline(outline);
    const project = makeProject({
      cta_goal: "visit_product",
      final_cta: "Click here",
      cta_url: "https://example.com",
    });
    const state = deriveProjectWorkflow({
      project,
      strategyState: makeStrategyState(),
      readinessScore: 85,
      outline,
      sections,
    });
    expect(state.steps.publish).toBe("current");
    expect(state.canPublish).toBe(true);
  });

  it("canPublish is false when there are blockers", () => {
    const outline = makeApprovedOutline();
    const sections = makeSectionsForOutline(outline, [
      { content_html: "" },
      {},
      {},
    ]);
    const state = deriveProjectWorkflow({
      project: makeProject(),
      strategyState: makeStrategyState(),
      readinessScore: 85,
      outline,
      sections,
    });
    expect(state.canPublish).toBe(false);
  });

  it("writingProgress is computed correctly", () => {
    const outline = makeApprovedOutline();
    // 1 of 3 sections completed
    const sections = [
      makeSection({ id: "sec-1", outline_section_id: "os-1", status: "generated", content_html: "<p>A</p>" }),
    ];
    const state = deriveProjectWorkflow({
      project: makeProject(),
      strategyState: makeStrategyState(),
      readinessScore: 85,
      outline,
      sections,
    });
    expect(state.completedSectionCount).toBe(1);
    expect(state.totalSectionCount).toBe(3);
    expect(state.writingProgress).toBe(33);
  });

  it("writingProgress is 0 when no outline", () => {
    const state = deriveProjectWorkflow({
      project: makeProject(),
      strategyState: makeStrategyState(),
      readinessScore: 85,
      outline: null,
      sections: [],
    });
    expect(state.writingProgress).toBe(0);
    expect(state.totalSectionCount).toBe(0);
  });

  it("orphan sections do not inflate completedSectionCount or progress", () => {
    const outline = makeApprovedOutline();
    const sections = [
      makeSection({
        id: "sec-1",
        outline_section_id: "os-1",
        status: "generated",
        content_html: "<p>A</p>",
      }),
      // orphan: not in outline
      makeSection({
        id: "sec-orphan",
        outline_section_id: "os-orphan",
        status: "generated",
        content_html: "<p>Orphan</p>",
      }),
      // extra completed row for same outline id still maps once for write-complete,
      // but countCompletedSections counts matching rows; only valid IDs count
      makeSection({
        id: "sec-extra",
        outline_section_id: "os-999",
        status: "edited",
        content_html: "<p>Extra</p>",
      }),
    ];
    const state = deriveProjectWorkflow({
      project: makeProject(),
      strategyState: makeStrategyState(),
      readinessScore: 85,
      outline,
      sections,
    });
    expect(state.completedSectionCount).toBe(1);
    expect(state.totalSectionCount).toBe(3);
    expect(state.writingProgress).toBe(33);
    expect(state.writingProgress).toBeLessThanOrEqual(100);
  });
});

// ---------------------------------------------------------------------------
// deriveProjectWorkflow — edge cases
// ---------------------------------------------------------------------------

describe("deriveProjectWorkflow - edge cases", () => {
  it("status generating section does not count as complete", () => {
    const outline = makeApprovedOutline();
    const sections = makeSectionsForOutline(outline, [
      { status: "generating", content_html: "<p>partial</p>" },
      { status: "generating", content_html: "<p>partial</p>" },
      { status: "generating", content_html: "<p>partial</p>" },
    ]);
    const state = deriveProjectWorkflow({
      project: makeProject(),
      strategyState: makeStrategyState(),
      readinessScore: 85,
      outline,
      sections,
    });
    expect(state.completedSectionCount).toBe(0);
    expect(state.recommendedStep).toBe("write");
    // Should have blockers for incomplete sections
    expect(state.blockers.some((b) => b.code.startsWith("incomplete_section_"))).toBe(true);
  });

  it("penultimate section status counts as generated or edited", () => {
    const outline = makeApprovedOutline();
    const sections = makeSectionsForOutline(outline, [
      { status: "edited", content_html: "<p>A</p>" },
      { status: "generated", content_html: "<p>B</p>" },
      { status: "edited", content_html: "<p>C</p>" },
    ]);
    const state = deriveProjectWorkflow({
      project: makeProject(),
      strategyState: makeStrategyState(),
      readinessScore: 85,
      outline,
      sections,
    });
    expect(state.completedSectionCount).toBe(3);
  });

  it("outline with fewer than 3 valid titled sections is not complete", () => {
    const outline = makeApprovedOutline([
      { id: "os-1", title: "Only" },
      { id: "os-2", title: "" },
      { id: "os-3", title: "  " },
    ]);
    outline.approved = true;
    const state = deriveProjectWorkflow({
      project: makeProject(),
      strategyState: makeStrategyState(),
      readinessScore: 85,
      outline,
      sections: [],
    });
    expect(state.blockers.some((b) => b.code === "outline_insufficient_sections")).toBe(true);
    // Should not be complete because only 1 valid title
    expect(state.steps.outline).not.toBe("complete");
  });
});

// ---------------------------------------------------------------------------
// isStrategyReady (public wrapper)
// ---------------------------------------------------------------------------

describe("isStrategyReady", () => {
  it("returns true when readiness >= 70 and all required fields present", () => {
    expect(isStrategyReady(makeFullStrategy(), 80)).toBe(true);
    expect(isStrategyReady(makeFullStrategy(), 70)).toBe(true);
  });

  it("returns false when readiness < 70", () => {
    expect(isStrategyReady(makeFullStrategy(), 69)).toBe(false);
  });

  it("returns false when a required field is null", () => {
    const s = makeFullStrategy();
    s.desired_outcome = null;
    expect(isStrategyReady(s, 80)).toBe(false);
  });

  it("returns false when a required field is empty string", () => {
    const s = makeFullStrategy();
    s.core_promise = "   ";
    expect(isStrategyReady(s, 80)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// getStrategyBlockers
// ---------------------------------------------------------------------------

describe("getStrategyBlockers", () => {
  it("returns empty array when strategy is ready", () => {
    const blockers = getStrategyBlockers(makeFullStrategy(), 85);
    expect(blockers.length).toBe(0);
  });

  it("returns readiness blocker when score < 70", () => {
    const blockers = getStrategyBlockers(makeFullStrategy(), 40);
    expect(blockers.some((b) => b.code === "readiness_below_threshold")).toBe(true);
  });

  it("returns missing_field blockers for each missing required field", () => {
    const s = makeFullStrategy();
    s.topic = null;
    s.audience = "  ";
    const blockers = getStrategyBlockers(s, 80);
    expect(blockers.filter((b) => b.code === "missing_field").length).toBe(2);
    const topics = blockers.filter(
      (b) => b.code === "missing_field" && b.message.includes("topic"),
    );
    expect(topics.length).toBe(1);
  });

  it("returns both readiness and missing_field blockers when both conditions", () => {
    const s = makeFullStrategy();
    s.topic = null;
    s.unique_angle = "";
    const blockers = getStrategyBlockers(s, 50);
    expect(blockers.some((b) => b.code === "readiness_below_threshold")).toBe(true);
    expect(blockers.filter((b) => b.code === "missing_field").length).toBe(2);
  });

  it("all blockers target the strategy step", () => {
    const s = makeFullStrategy();
    s.topic = null;
    const blockers = getStrategyBlockers(s, 50);
    for (const b of blockers) {
      expect(b.targetStep).toBe("strategy");
    }
  });
});

// ---------------------------------------------------------------------------
// parseWorkflowStep
// ---------------------------------------------------------------------------

describe("parseWorkflowStep", () => {
  it("returns valid step as-is", () => {
    expect(parseWorkflowStep("strategy", "outline")).toBe("strategy");
    expect(parseWorkflowStep("outline", "strategy")).toBe("outline");
    expect(parseWorkflowStep("write", "strategy")).toBe("write");
    expect(parseWorkflowStep("review", "strategy")).toBe("review");
    expect(parseWorkflowStep("publish", "strategy")).toBe("publish");
  });

  it("falls back to recommended when null/undefined/empty", () => {
    expect(parseWorkflowStep(null, "outline")).toBe("outline");
    expect(parseWorkflowStep(undefined, "write")).toBe("write");
    expect(parseWorkflowStep("", "review")).toBe("review");
  });

  it("falls back to recommended when invalid", () => {
    expect(parseWorkflowStep("nope", "strategy")).toBe("strategy");
    expect(parseWorkflowStep("foo", "publish")).toBe("publish");
    expect(parseWorkflowStep("6", "outline")).toBe("outline");
  });

  it("is case-sensitive: uppercase does not match", () => {
    // Implementation uses exact ALL_STEPS membership (lowercase only)
    expect(parseWorkflowStep("Strategy", "outline")).toBe("outline");
    expect(parseWorkflowStep("WRITE", "strategy")).toBe("strategy");
    expect(parseWorkflowStep("Review", "publish")).toBe("publish");
  });
});
