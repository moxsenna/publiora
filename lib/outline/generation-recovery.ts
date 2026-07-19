import type { OutlineSection } from "@/types/outline";

export type GenerationMarkFlags = {
  projectMarkedGenerating: boolean;
  sectionMarkedGenerating: boolean;
  previousSectionStatus: OutlineSection["status"];
};

/**
 * Decide what restoreAfterFailure must do when generation aborts.
 * Pure — used by route and regression tests.
 */
export function planGenerationRestore(flags: GenerationMarkFlags): {
  shouldRestoreProject: boolean;
  shouldRestoreSection: boolean;
  sectionStatus: OutlineSection["status"] | null;
} {
  const shouldRestoreProject = flags.projectMarkedGenerating;
  const shouldRestoreSection = flags.sectionMarkedGenerating;

  if (!shouldRestoreSection) {
    return {
      shouldRestoreProject,
      shouldRestoreSection: false,
      sectionStatus: null,
    };
  }

  const prev = flags.previousSectionStatus;
  // Prefer explicit failed so UI can offer Retry instead of stuck generating
  const restoreStatus = prev === "generating" ? "failed" : prev;
  const sectionStatus: OutlineSection["status"] =
    restoreStatus === "generated" ||
    restoreStatus === "failed" ||
    restoreStatus === "pending"
      ? restoreStatus
      : "failed";

  return {
    shouldRestoreProject,
    shouldRestoreSection: true,
    sectionStatus,
  };
}

/**
 * Simulate the mark sequence used by generateOne:
 * 1) project -> generating
 * 2) outline section -> generating
 * If step 2 fails, project was already marked and must be restored.
 */
export function simulateMarkGeneratingSequence(
  outlineMarkSucceeds: boolean,
): GenerationMarkFlags & { aborted: boolean } {
  let projectMarkedGenerating = false;
  let sectionMarkedGenerating = false;

  // step 1 always "succeeds" in this pure sim when called
  projectMarkedGenerating = true;

  if (!outlineMarkSucceeds) {
    return {
      projectMarkedGenerating,
      sectionMarkedGenerating,
      previousSectionStatus: "pending",
      aborted: true,
    };
  }

  sectionMarkedGenerating = true;
  return {
    projectMarkedGenerating,
    sectionMarkedGenerating,
    previousSectionStatus: "pending",
    aborted: false,
  };
}
