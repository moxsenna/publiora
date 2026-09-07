// @vitest-environment jsdom

import * as React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { beforeEach, describe, expect, it, vi } from "vitest";

const publishMutateAsync = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock("@/lib/api/hooks", () => ({
  usePublishEbook: () => ({
    isPending: false,
    mutateAsync: publishMutateAsync,
  }),
}));

vi.mock("@/store/projectStore", () => ({
  useUiStore: (selector: (state: { pushToast: ReturnType<typeof vi.fn> }) => unknown) =>
    selector({ pushToast: vi.fn() }),
}));

import { ReviewChecklist } from "@/components/workspace/ReviewChecklist";
import { PublishDialog } from "@/components/workspace/PublishDialog";
import { Radio } from "@/components/ui/Radio";
import {
  getReviewCheckCopy,
  getReviewStepActionCopy,
} from "@/lib/i18n/id/review";
import type { ProjectWorkflowStep, WorkflowCheck } from "@/types/workflow";

describe("Task9 review blockers", () => {
  it("maps stable workflow IDs, codes, and section patterns to Indonesian copy", () => {
    expect(getReviewCheckCopy({ id: "title_empty" }).title).toBe(
      "Judul ebook belum diisi",
    );
    expect(
      getReviewCheckCopy({ id: "opaque", code: "cta_url_invalid" }).title,
    ).toBe("URL CTA belum valid");
    expect(
      getReviewCheckCopy({ id: "missing_section_section-123" }).title,
    ).toBe("Ada bagian yang belum dibuat");
  });

  it("uses safe Indonesian fallback and never returns raw messages", () => {
    const raw = "provider secret raw failure";
    const copy = getReviewCheckCopy({
      id: "unknown_check",
      label: raw,
      title: raw,
      description: raw,
      message: raw,
    });

    expect(copy).toEqual({
      title: "Pemeriksaan ini perlu ditinjau",
      description: "Buka tahap terkait untuk memeriksa dan memperbaikinya.",
    });
    expect(JSON.stringify(copy)).not.toContain(raw);
  });

  it("maps ProjectWorkflowStep values instead of rendering raw step strings", () => {
    const steps: ProjectWorkflowStep[] = [
      "strategy",
      "outline",
      "write",
      "review",
      "publish",
    ];

    expect(steps.map(getReviewStepActionCopy)).toEqual([
      "Buka Strategi",
      "Buka Outline",
      "Buka Penulisan",
      "Buka Review",
      "Buka Penerbitan",
    ]);
  });

  it("ReviewChecklist renders mapped copy, not raw workflow payload copy", () => {
    const raw = "provider secret raw failure";
    const check: WorkflowCheck = {
      id: "title_empty",
      label: raw,
      message: raw,
      severity: "blocker",
      targetStep: "review",
    };

    render(<ReviewChecklist checks={[check]} onNavigateCheck={vi.fn()} />);

    expect(screen.getByText("Judul ebook belum diisi")).toBeInTheDocument();
    expect(screen.queryByText(raw)).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Buka Review" })).toBeInTheDocument();
  });
});

describe("Task9 claim-only publish", () => {
  beforeEach(() => {
    publishMutateAsync.mockReset();
    publishMutateAsync.mockResolvedValue({ id: "published-1" });
  });

  it("publishes claim-only without a visibility flag", async () => {
    render(
      <PublishDialog
        open
        onClose={vi.fn()}
        projectId="project-1"
        isPublished
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Terbitkan ulang" }));

    expect(publishMutateAsync).toHaveBeenCalledWith({
      project_id: "project-1",
    });
  });

  it("does not offer public/private visibility on republish", () => {
    render(
      <PublishDialog
        open
        onClose={vi.fn()}
        projectId="project-1"
        isPublished
      />,
    );

    expect(screen.queryByRole("radio")).not.toBeInTheDocument();
    expect(screen.queryByRole("group", { name: "Visibilitas" })).not.toBeInTheDocument();
  });

  it("uses native accessible radios inside a named radio group", () => {
    const onChange = vi.fn();
    render(
      <fieldset>
        <legend>Visibilitas</legend>
        <Radio
          name="visibility"
          value="public"
          checked
          onChange={onChange}
          label="Publik"
        />
        <Radio
          name="visibility"
          value="private"
          checked={false}
          onChange={onChange}
          label="Privat"
        />
      </fieldset>,
    );

    const group = screen.getByRole("group", { name: "Visibilitas" });
    const publicRadio = screen.getByRole("radio", { name: "Publik" });
    const privateRadio = screen.getByRole("radio", { name: "Privat" });
    expect(group).toContainElement(publicRadio);
    expect(publicRadio).toHaveAttribute("type", "radio");
    expect(publicRadio).toHaveAttribute("name", "visibility");
    expect(privateRadio).toHaveAttribute("value", "private");

    fireEvent.click(privateRadio);
    expect(onChange).toHaveBeenCalledTimes(1);
  });
});
