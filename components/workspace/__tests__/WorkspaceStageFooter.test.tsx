// @vitest-environment jsdom

import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import * as React from "react";
import { WorkspaceStageFooter } from "@/components/workspace/WorkspaceStageFooter";
import type { ProjectWorkflowState } from "@/types/workflow";

const workflow: ProjectWorkflowState = {
  recommendedStep: "write",
  steps: {
    strategy: "complete",
    outline: "complete",
    write: "current",
    review: "blocked",
    publish: "blocked",
  },
  checks: [],
  blockers: [],
  completedSectionCount: 2,
  totalSectionCount: 5,
  writingProgress: 40,
  canPublish: false,
};

describe("WorkspaceStageFooter", () => {
  it("names the writing progress indicator in Indonesian", () => {
    render(
      <WorkspaceStageFooter
        current="write"
        workflow={workflow}
        canAct={false}
        onNavigate={vi.fn()}
        onPublish={vi.fn()}
      />,
    );

    expect(
      screen.getByRole("progressbar", { name: "Progres penulisan: 40%" }),
    ).toBeInTheDocument();
  });
});
