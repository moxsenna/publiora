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

import { PublishDialog } from "@/components/workspace/PublishDialog";

describe("PublishDialog claim-only publish", () => {
  beforeEach(() => {
    publishMutateAsync.mockReset();
    publishMutateAsync.mockResolvedValue({ id: "published-1" });
  });

  it("offers no public/private visibility choice", () => {
    render(
      <PublishDialog open onClose={vi.fn()} projectId="project-1" isPublished={false} />,
    );

    expect(screen.queryByRole("radio")).not.toBeInTheDocument();
    expect(screen.queryByText("Publik")).not.toBeInTheDocument();
    expect(screen.queryByText("Privat")).not.toBeInTheDocument();
    expect(screen.queryByText("Visibilitas")).not.toBeInTheDocument();
    expect(screen.getByText(/akses hanya melalui tautan klaim/)).toBeInTheDocument();
  });

  it("publishes without sending a visibility flag (server forces non-public)", async () => {
    render(
      <PublishDialog open onClose={vi.fn()} projectId="project-1" isPublished={false} />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Terbitkan sekarang" }));

    expect(publishMutateAsync).toHaveBeenCalledWith({
      project_id: "project-1",
    });
  });

  it("republish label and copy lead to claim creation, not showcase", async () => {
    render(
      <PublishDialog open onClose={vi.fn()} projectId="project-1" isPublished />,
    );

    expect(screen.getByRole("button", { name: "Terbitkan ulang" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Terbitkan ulang" }));

    expect(publishMutateAsync).toHaveBeenCalledWith({
      project_id: "project-1",
    });
  });
});