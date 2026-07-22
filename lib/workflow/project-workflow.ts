// Project workflow derivation — determines the current state of the ebook pipeline.

import type { Project } from "@/types/project";
import type { Section } from "@/types/section";
import type { Outline } from "@/types/outline";
import type {
  ProjectStateV2,
  EbookStrategy,
} from "@/types/strategy";
import { REQUIRED_STRATEGY_FIELDS } from "@/types/strategy";
import type {
  ProjectWorkflowStep,
  WorkflowStepStatus,
  WorkflowBlocker,
  WorkflowCheck,
  ProjectWorkflowState,
} from "@/types/workflow";
import { CTA_URL_REQUIRED_GOALS, type CtaGoal } from "@/types/ai-suggestions";
import { resolveFormatContext } from "@/lib/templates/format-context";
import {
  buildSemanticReviewChecks,
  mergeWorkflowChecks,
} from "@/lib/quality/project-review";
import type { ProjectOfferContext } from "@/types/offer";

// ---------------------------------------------------------------------------
// Input type
// ---------------------------------------------------------------------------

export interface DeriveProjectWorkflowInput {
  project: Project;
  strategyState: ProjectStateV2;
  readinessScore: number;
  outline: Outline | null;
  sections: Section[];
  offer_context?: ProjectOfferContext | null;
}

// ---------------------------------------------------------------------------
// deriveProjectWorkflow
// ---------------------------------------------------------------------------

export function deriveProjectWorkflow(
  input: DeriveProjectWorkflowInput,
): ProjectWorkflowState {
  const { project, strategyState, readinessScore, outline, sections } = input;

  const checks: WorkflowCheck[] = [];
  const blockers: WorkflowBlocker[] = [];

  // -----------------------------------------------------------------------
  // Strategy assessment
  // -----------------------------------------------------------------------
  const strategyComplete = checkStrategyComplete(
    strategyState.strategy,
    readinessScore,
  );

  if (!strategyComplete) {
    checks.push({
      id: "strategy_incomplete",
      label: "Strategy readiness below threshold or missing required fields",
      severity: "blocker",
      targetStep: "outline",
    });
    blockers.push({
      code: "strategy_incomplete",
      message: "Complete the strategy before creating an outline.",
      targetStep: "outline",
    });
  }

  // -----------------------------------------------------------------------
  // Outline assessment
  // -----------------------------------------------------------------------
  const outlineComplete = checkOutlineComplete(outline);

  if (!outlineComplete && outline) {
    // Outline exists but not approved or insufficient sections
    if (!outline.approved) {
      checks.push({
        id: "outline_not_approved",
        label: "Outline has not been approved yet",
        severity: "blocker",
        targetStep: "write",
      });
      blockers.push({
        code: "outline_not_approved",
        message: "Approve the outline before writing sections.",
        targetStep: "write",
      });
    }
    if (!hasMinimumSections(outline)) {
      checks.push({
        id: "outline_insufficient_sections",
        label: "Outline has fewer than 3 sections with non-empty titles",
        severity: "blocker",
        targetStep: "write",
      });
      blockers.push({
        code: "outline_insufficient_sections",
        message: "The outline needs at least 3 sections with titles.",
        targetStep: "write",
      });
    }
  }

  if (!outline) {
    checks.push({
      id: "outline_missing",
      label: "No outline created yet",
      severity: "blocker",
      message: "Create an outline before writing.",
      targetStep: "write",
    });
    blockers.push({
      code: "outline_missing",
      message: "Create an outline before writing sections.",
      targetStep: "write",
    });
  }

  // -----------------------------------------------------------------------
  // Write assessment
  // -----------------------------------------------------------------------
  const writeComplete = checkWriteComplete(
    outline,
    sections,
    checks,
    blockers,
  );

  // -----------------------------------------------------------------------
  // Review assessment
  // -----------------------------------------------------------------------
  checkReviewState(project, outline, sections, checks, blockers);

  // -----------------------------------------------------------------------
  // Compute step statuses
  // -----------------------------------------------------------------------
  const steps: Record<ProjectWorkflowStep, WorkflowStepStatus> =
    computeStepStatuses(
      strategyComplete,
      outlineComplete,
      outline,
      writeComplete,
      checks,
      project,
    );

  // -----------------------------------------------------------------------
  // Recommended step
  // -----------------------------------------------------------------------
  const recommendedStep = computeRecommendedStep(
    strategyComplete,
    outlineComplete,
    outline,
    writeComplete,
    checks,
    project,
  );

  // -----------------------------------------------------------------------
  // Overall canPublish
  // -----------------------------------------------------------------------
  const hasBlockers = checks.some((c) => c.severity === "blocker");

  const totalSectionCount = outline
    ? countValidOutlineSections(outline)
    : 0;
  const completedSectionCount = outline
    ? countCompletedSections(outline, sections)
    : 0;
  const writingProgress =
    totalSectionCount > 0
      ? Math.min(
          100,
          Math.round((completedSectionCount / totalSectionCount) * 100),
        )
      : 0;

  const ebookType =
    project.ebook_type === "bonus_product" ||
    project.ebook_type === "sellable_ebook" ||
    project.ebook_type === "lead_magnet"
      ? project.ebook_type
      : "lead_magnet";
  const format_context = resolveFormatContext({
    ebookType,
    templateId: project.template_id ?? null,
  });
  const semanticChecks = buildSemanticReviewChecks({
    project,
    strategy: strategyState.strategy,
    format_context,
    offer_context: input.offer_context ?? null,
    outline,
    sections,
  });
  const mergedChecks = mergeWorkflowChecks(checks, semanticChecks);
  const hasPublishBlockers = mergedChecks.some(
    (c) =>
      c.severity === "blocker" &&
      (c.category === "publication" ||
        c.category === "structure" ||
        c.category === "strategy" ||
        c.category === "cta" ||
        !c.category),
  );

  return {
    recommendedStep,
    steps,
    checks: mergedChecks,
    blockers,
    completedSectionCount,
    totalSectionCount,
    writingProgress,
    canPublish: !hasPublishBlockers && writeComplete && !!project.title,
  };
}

// ---------------------------------------------------------------------------
// Checks
// ---------------------------------------------------------------------------

function checkStrategyComplete(
  strategy: EbookStrategy,
  readinessScore: number,
): boolean {
  if (readinessScore < 70) return false;
  for (const key of REQUIRED_STRATEGY_FIELDS) {
    const v = strategy[key];
    if (!v || (typeof v === "string" && v.trim().length === 0)) return false;
  }
  return true;
}

function checkOutlineComplete(outline: Outline | null): boolean {
  if (!outline) return false;
  if (!outline.approved) return false;
  if (!hasMinimumSections(outline)) return false;
  return true;
}

function hasMinimumSections(outline: Outline): boolean {
  return (
    outline.sections.filter(
      (s) => s.title && s.title.trim().length > 0,
    ).length >= 3
  );
}

function checkWriteComplete(
  outline: Outline | null,
  sections: Section[],
  checks: WorkflowCheck[],
  blockers: WorkflowBlocker[],
): boolean {
  if (!outline || !outline.approved) return false;

  const validOutlineSections = outline.sections.filter(
    (s) => s.title && s.title.trim().length > 0,
  );

  // Build a map of outline_section_id -> section
  const sectionMap = new Map<string, Section>();
  for (const sec of sections) {
    sectionMap.set(sec.outline_section_id, sec);
  }

  // Check each outline section has a corresponding persisted section
  let allOk = true;
  for (const outlineSec of validOutlineSections) {
    const section = sectionMap.get(outlineSec.id);
    if (!section) {
      checks.push({
        id: `missing_section_${outlineSec.id}`,
        label: `Section "${outlineSec.title}" has not been generated yet`,
        severity: "blocker",
        targetStep: "write",
      });
      blockers.push({
        code: `missing_section_${outlineSec.id}`,
        message: `Section "${outlineSec.title}" needs to be generated.`,
        targetStep: "write",
      });
      allOk = false;
      continue;
    }

    if (
      section.status !== "generated" &&
      section.status !== "edited"
    ) {
      if (section.status === "failed") {
        checks.push({
          id: `failed_section_${section.id}`,
          label: `Section "${section.title}" generation failed`,
          severity: "blocker",
          targetStep: "write",
        });
        blockers.push({
          code: `failed_section_${section.id}`,
          message: `Section "${section.title}" generation failed. Regenerate it.`,
          targetStep: "write",
        });
      } else {
        checks.push({
          id: `incomplete_section_${section.id}`,
          label: `Section "${section.title}" is not yet generated`,
          severity: "blocker",
          targetStep: "write",
        });
        blockers.push({
          code: `incomplete_section_${section.id}`,
          message: `Section "${section.title}" must be generated before publishing.`,
          targetStep: "write",
        });
      }
      allOk = false;
      continue;
    }

    // Check non-empty sanitized text content
    const text = stripHtml(section.content_html);
    if (!text || text.trim().length === 0) {
      checks.push({
        id: `empty_section_${section.id}`,
        label: `Section "${section.title}" has empty content`,
        severity: "blocker",
        targetStep: "write",
      });
      blockers.push({
        code: `empty_section_${section.id}`,
        message: `Section "${section.title}" has no content. Generate or edit it.`,
        targetStep: "write",
      });
      allOk = false;
    }
  }

  return allOk;
}

function checkReviewState(
  project: Project,
  outline: Outline | null,
  sections: Section[],
  checks: WorkflowCheck[],
  blockers: WorkflowBlocker[],
): void {
  // Title empty
  if (!project.title || project.title.trim().length === 0) {
    checks.push({
      id: "title_empty",
      label: "Project title is empty",
      severity: "blocker",
      targetStep: "review",
    });
    blockers.push({
      code: "title_empty",
      message: "Add a title before publishing.",
      targetStep: "review",
    });
  }

  // Subtitle empty (warning)
  if (!project.subtitle || project.subtitle.trim().length === 0) {
    checks.push({
      id: "subtitle_empty",
      label: "Subtitle is empty",
      severity: "warning",
      targetStep: "review",
    });
  }

  // Content checks: section length analysis
  if (sections.length > 0) {
    checkSectionContentQuality(outline, sections, checks);
  }

  // CTA checks
  checkCtaRules(project, checks, blockers);
}

function checkSectionContentQuality(
  outline: Outline | null,
  sections: Section[],
  checks: WorkflowCheck[],
): void {
  const wordCounts: number[] = [];

  // Check duplicate titles
  const titleCounts = new Map<string, number>();
  for (const sec of sections) {
    const t = sec.title.trim().toLowerCase();
    if (t.length > 0) {
      titleCounts.set(t, (titleCounts.get(t) ?? 0) + 1);
    }
    if (sec.word_count > 0) {
      wordCounts.push(sec.word_count);
    }
  }

  for (const [title, count] of titleCounts) {
    if (count > 1) {
      checks.push({
        id: `duplicate_title_${title.slice(0, 20)}`,
        label: `Duplicate section title detected`,
        severity: "warning",
        message: `Section title appears ${count} times.`,
        targetStep: "review",
      });
      // Only report once; break
      break;
    }
  }

  // Section much shorter than median
  if (wordCounts.length >= 3) {
    const sorted = [...wordCounts].sort((a, b) => a - b);
    const median =
      sorted.length % 2 === 1
        ? sorted[Math.floor(sorted.length / 2)]
        : (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2;

    for (const sec of sections) {
      if (sec.word_count > 0 && sec.word_count < median * 0.5) {
        checks.push({
          id: `short_section_${sec.id}`,
          label: `Section "${sec.title}" is much shorter than the median`,
          severity: "warning",
          message: `Section has ${sec.word_count} words vs median ${Math.round(median)}.`,
          targetStep: "review",
        });
      }
    }
  }
}

function checkCtaRules(
  project: Project,
  checks: WorkflowCheck[],
  blockers: WorkflowBlocker[],
): void {
  const ctaGoal = project.cta_goal as CtaGoal | undefined | null;

  // No CTA configured at all (warning)
  if (!ctaGoal) {
    checks.push({
      id: "no_cta_configured",
      label: "No CTA configured",
      severity: "warning",
      targetStep: "review",
    });
    return;
  }

  // CTA goal selected but CTA text empty
  if (!project.final_cta || project.final_cta.trim().length === 0) {
    checks.push({
      id: "cta_text_empty",
      label: "CTA goal selected but CTA text is empty",
      severity: "blocker",
      targetStep: "review",
    });
    blockers.push({
      code: "cta_text_empty",
      message: "Enter CTA text before publishing.",
      targetStep: "review",
    });
  }

  // URL-required CTA check
  const urlRequired = CTA_URL_REQUIRED_GOALS.includes(ctaGoal);

  // For "custom", URL is required only if provided (allow empty)
  if (ctaGoal === "custom") {
    if (project.cta_url && !isValidUrl(project.cta_url)) {
      checks.push({
        id: "cta_url_invalid",
        label: "CTA URL is invalid",
        severity: "blocker",
        targetStep: "review",
      });
      blockers.push({
        code: "cta_url_invalid",
        message: "The CTA URL is not valid.",
        targetStep: "review",
      });
    }
    return;
  }

  if (urlRequired) {
    if (!project.cta_url || !isValidUrl(project.cta_url)) {
      checks.push({
        id: "cta_url_missing_or_invalid",
        label: "CTA requires a valid destination URL",
        severity: "blocker",
        targetStep: "review",
      });
      blockers.push({
        code: "cta_url_missing_or_invalid",
        message: `The selected CTA goal "${ctaGoal}" requires a valid URL.`,
        targetStep: "review",
      });
    }
  }
}

// ---------------------------------------------------------------------------
// Step statuses
// ---------------------------------------------------------------------------

function computeStepStatuses(
  strategyComplete: boolean,
  outlineComplete: boolean,
  outline: Outline | null,
  writeComplete: boolean,
  checks: WorkflowCheck[],
  project: Project,
): Record<ProjectWorkflowStep, WorkflowStepStatus> {
  const isPublished = project.status === "published";

  const statuses: Record<ProjectWorkflowStep, WorkflowStepStatus> = {
    strategy: "available",
    outline: "available",
    write: "available",
    review: "available",
    publish: "available",
  };

  // Strategy
  statuses.strategy = strategyComplete ? "complete" : "current";

  // Outline
  if (!strategyComplete) {
    statuses.outline = "blocked";
  } else if (outlineComplete) {
    statuses.outline = "complete";
  } else if (outline) {
    // Unapproved outline
    const hasOutlineBlockers = checks.some(
      (c) =>
        c.targetStep === "write" &&
        (c.id === "outline_not_approved" ||
          c.id === "outline_insufficient_sections"),
    );
    statuses.outline = hasOutlineBlockers ? "needs_attention" : "current";
  } else {
    // No outline at all after strategy complete
    statuses.outline = "current";
  }

  // Write
  if (!outlineComplete && outline && !strategyComplete) {
    statuses.write = "blocked";
  } else if (!outlineComplete) {
    statuses.write = "blocked";
  } else if (writeComplete) {
    statuses.write = "complete";
  } else {
    statuses.write = "current";
  }

  // Review
  if (writeComplete) {
    const hasReviewBlockers = checks.some(
      (c) => c.targetStep === "review" && c.severity === "blocker",
    );
    const hasReviewWarnings = checks.some(
      (c) => c.targetStep === "review" && c.severity === "warning",
    );
    if (hasReviewBlockers) {
      statuses.review = "needs_attention";
    } else if (hasReviewWarnings) {
      statuses.review = "needs_attention";
    } else {
      statuses.review = "complete";
    }
    statuses.publish = hasReviewBlockers ? "blocked" : "current";
  } else {
    statuses.review = "blocked";
    statuses.publish = "blocked";
  }

  // If already published, everything is complete
  if (isPublished) {
    for (const key of Object.keys(statuses) as ProjectWorkflowStep[]) {
      statuses[key] = "complete";
    }
    statuses.publish = "current";
  }

  return statuses;
}

// ---------------------------------------------------------------------------
// Recommended step
// ---------------------------------------------------------------------------

function computeRecommendedStep(
  strategyComplete: boolean,
  outlineComplete: boolean,
  outline: Outline | null,
  writeComplete: boolean,
  checks: WorkflowCheck[],
  project: Project,
): ProjectWorkflowStep {
  // If already published, default to publish
  if (project.status === "published") return "publish";

  // First incomplete stage
  if (!strategyComplete) return "strategy";

  if (!outlineComplete) return "outline";

  if (!writeComplete) return "write";

  const hasReviewBlockers = checks.some(
    (c) => c.targetStep === "review" && c.severity === "blocker",
  );
  const hasReviewWarnings = checks.some(
    (c) => c.targetStep === "review" && c.severity === "warning",
  );

  if (hasReviewBlockers || hasReviewWarnings) return "review";

  return "publish";
}

// ---------------------------------------------------------------------------
// Utilities
// ---------------------------------------------------------------------------

function stripHtml(html: string): string {
  if (!html) return "";
  return html.replace(/<[^>]*>/g, "").trim();
}

function isValidUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

function countCompletedSections(
  outline: Outline,
  sections: Section[],
): number {
  const validIds = new Set(
    outline.sections
      .filter((s) => s.title && s.title.trim().length > 0)
      .map((s) => s.id),
  );
  return sections.filter(
    (s) =>
      validIds.has(s.outline_section_id) &&
      (s.status === "generated" || s.status === "edited"),
  ).length;
}

function countValidOutlineSections(outline: Outline): number {
  return outline.sections.filter(
    (s) => s.title && s.title.trim().length > 0,
  ).length;
}

// ---------------------------------------------------------------------------
// Re-export for testing convenience
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Strategy readiness helpers (shared across outline generation and workflow)
// ---------------------------------------------------------------------------

export interface StrategyBlocker {
  code: string;
  message: string;
  targetStep: ProjectWorkflowStep;
}

/**
 * Pure readiness check: used by both the outline-generate route and the
 * workflow derivation so there is one canonical definition.
 */
export function isStrategyReady(
  strategy: EbookStrategy,
  readinessScore: number,
): boolean {
  return checkStrategyComplete(strategy, readinessScore);
}

/**
 * Build a structured list of blockers when strategy is not ready for outline
 * generation. Returns an empty array when strategy IS ready.
 *
 * Blockers list:
 * 1. readiness_below_threshold when readiness < 70
 * 2. One missing_field entry for each required field that is empty/null
 */
export function getStrategyBlockers(
  strategy: EbookStrategy,
  readinessScore: number,
): StrategyBlocker[] {
  const blockers: StrategyBlocker[] = [];

  if (readinessScore < 70) {
    blockers.push({
      code: "readiness_below_threshold",
      message: `Strategy readiness is ${readinessScore}/100 (minimum 70 required).`,
      targetStep: "strategy",
    });
  }

  for (const key of REQUIRED_STRATEGY_FIELDS) {
    const v = strategy[key];
    if (
      v === null ||
      v === undefined ||
      (typeof v === "string" && v.trim().length === 0)
    ) {
      blockers.push({
        code: "missing_field",
        message: `${key} is required`,
        targetStep: "strategy",
      });
    }
  }

  return blockers;
}

// ---------------------------------------------------------------------------
// parseWorkflowStep — validate a step query param, fall back to recommended
// ---------------------------------------------------------------------------

const ALL_STEPS: ProjectWorkflowStep[] = [
  "strategy",
  "outline",
  "write",
  "review",
  "publish",
];

function isValidWorkflowStep(v: string): v is ProjectWorkflowStep {
  return ALL_STEPS.includes(v as ProjectWorkflowStep);
}

/**
 * Parse a `?step=` query parameter value into a valid ProjectWorkflowStep.
 * Returns `recommended` when the parameter is missing or invalid.
 */
export function parseWorkflowStep(
  param: string | null | undefined,
  recommended: ProjectWorkflowStep,
): ProjectWorkflowStep {
  if (param && isValidWorkflowStep(param)) return param;
  return recommended;
}

export {
  checkStrategyComplete,
  checkOutlineComplete,
  checkWriteComplete,
  stripHtml,
  isValidUrl,
  countValidOutlineSections,
};
