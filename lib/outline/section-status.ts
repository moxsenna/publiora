import type { OutlineSection } from "@/types/outline";

/** Immutable update of one outline section status (for generate-all accumulation). */
export function setOutlineSectionStatus(
  sections: OutlineSection[],
  sectionId: string,
  status: OutlineSection["status"],
): OutlineSection[] {
  return sections.map((s) =>
    s.id === sectionId ? { ...s, status } : s,
  );
}

/**
 * After generate-all loop steps: earlier generated statuses must survive.
 * Pure helper used by tests + route.
 */
export function accumulateGeneratedStatuses(
  initial: OutlineSection[],
  generatedIdsInOrder: string[],
): OutlineSection[] {
  let next = initial.map((s) => ({ ...s }));
  for (const id of generatedIdsInOrder) {
    next = setOutlineSectionStatus(next, id, "generated");
  }
  return next;
}
