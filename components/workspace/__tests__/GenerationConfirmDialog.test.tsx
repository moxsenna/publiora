/** @vitest-environment jsdom */

import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { GenerationConfirmDialog } from "@/components/workspace/GenerationProgressPanel";

describe("GenerationConfirmDialog credit guard", () => {
  it("keeps start visible but disabled and never starts when balance is insufficient", () => {
    const onStart = vi.fn();
    render(
      <GenerationConfirmDialog
        open
        queueCount={3}
        sectionCost={10}
        balance={5}
        insufficient
        onCancel={vi.fn()}
        onStart={onStart}
      />,
    );

    const start = screen.getByRole("button", { name: "Mulai menulis" });
    expect(start).toBeDisabled();
    fireEvent.click(start);
    expect(onStart).not.toHaveBeenCalled();
  });
});
