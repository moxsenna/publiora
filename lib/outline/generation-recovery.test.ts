import { describe, expect, it } from "vitest";
import {
  planGenerationRestore,
  simulateMarkGeneratingSequence,
} from "./generation-recovery";

describe("planGenerationRestore", () => {
  it("restores project when only project was marked generating (outline mark failed)", () => {
    const plan = planGenerationRestore({
      projectMarkedGenerating: true,
      sectionMarkedGenerating: false,
      previousSectionStatus: "pending",
    });
    expect(plan.shouldRestoreProject).toBe(true);
    expect(plan.shouldRestoreSection).toBe(false);
    expect(plan.sectionStatus).toBeNull();
  });

  it("restores previous section status and project when writer fails", () => {
    const plan = planGenerationRestore({
      projectMarkedGenerating: true,
      sectionMarkedGenerating: true,
      previousSectionStatus: "pending",
    });
    expect(plan.shouldRestoreProject).toBe(true);
    expect(plan.shouldRestoreSection).toBe(true);
    expect(plan.sectionStatus).toBe("pending");
  });

  it("uses failed when previous status was generating", () => {
    const plan = planGenerationRestore({
      projectMarkedGenerating: true,
      sectionMarkedGenerating: true,
      previousSectionStatus: "generating",
    });
    expect(plan.sectionStatus).toBe("failed");
  });

  it("does nothing when nothing was marked", () => {
    const plan = planGenerationRestore({
      projectMarkedGenerating: false,
      sectionMarkedGenerating: false,
      previousSectionStatus: "pending",
    });
    expect(plan.shouldRestoreProject).toBe(false);
    expect(plan.shouldRestoreSection).toBe(false);
  });
});

describe("simulateMarkGeneratingSequence", () => {
  it("outline mark failure leaves projectMarkedGenerating true", () => {
    const flags = simulateMarkGeneratingSequence(false);
    expect(flags.aborted).toBe(true);
    expect(flags.projectMarkedGenerating).toBe(true);
    expect(flags.sectionMarkedGenerating).toBe(false);

    const plan = planGenerationRestore(flags);
    expect(plan.shouldRestoreProject).toBe(true);
    expect(plan.shouldRestoreSection).toBe(false);
  });

  it("successful marks set both flags", () => {
    const flags = simulateMarkGeneratingSequence(true);
    expect(flags.aborted).toBe(false);
    expect(flags.projectMarkedGenerating).toBe(true);
    expect(flags.sectionMarkedGenerating).toBe(true);
  });
});
