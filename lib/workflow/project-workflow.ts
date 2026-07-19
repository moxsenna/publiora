// Project workflow derivation — determines the current state of the ebook pipeline.

import type { Project } from "@/types/project";
import type { Section } from "@/types/section";
import type { Outline } from "@/types/outline";
import type {
  ProjectStateV2,
  EbookStrategy,
} from "@/types/strategy";
import type {
  ProjectWorkflowStep,
  WorkflowStepStatus,
  WorkflowBlocker,
  WorkflowCheck,
  ProjectWorkflowState,
} from "@/types/workflow";
import { CTA_URL_REQUIRED_GOALS, type CtaGoal } from "@/types/ai-suggestions";

// ---------------------------------------------------------------------------
// Input type
// ---------------------------------------------------------------------------

export interface DeriveProjectWorkflowInput {
  project: Project;
  strategyState: ProjectStateV2;
  readinessScore: number;
  outline: Outline | null;
  sections: Section[];
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

  const completedSectionCount = countCompletedSections(sections);
  const totalSectionCount = outline
    ? countValidOutlineSections(outline)
    : 0;
  const writingProgress =
    totalSectionCount > 0
      ? Math.round((completedSectionCount / totalSectionCount) * 100)
      : 0;

  return {
    recommendedStep,
    steps,
    checks,
    blockers,
    completedSectionCount,
    totalSectionCount,
    writingProgress,
    canPublish: !hasBlockers && writeComplete && !!project.title,
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
  const requiredScalars: (keyof EbookStrategy)[] = [
    "topic",
    "audience",
    "primary_problem",
    "desired_outcome",
    "core_promise",
    "unique_angle",
  ];
  for (const key of requiredScalars) {
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

function countCompletedSections(sections: Section[]): number {
  return sections.filter(
    (s) => s.status === "generated" || s.status === "edited",
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

export {
  checkStrategyComplete,
  checkOutlineComplete,
  checkWriteComplete,
  stripHtml,
  isValidUrl,
  countValidOutlineSections,
};
