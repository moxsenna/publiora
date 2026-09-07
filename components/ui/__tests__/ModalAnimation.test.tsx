// @vitest-environment jsdom

import * as React from "react";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { describe, it, expect, vi } from "vitest";
import { Modal } from "@/components/ui/Modal";

describe("Modal Animations", () => {
  it("renders backdrop and panel with dedicated enter animation classes", () => {
    render(
      <Modal open={true} onClose={vi.fn()} title="Test Dialog">
        <p>Modal content</p>
      </Modal>
    );
    const backdrop = screen.getByTestId("modal-backdrop");
    expect(backdrop.className).toContain("animate-modal-backdrop-enter");

    const dialog = screen.getByRole("dialog");
    expect(dialog.className).toContain("animate-modal-enter");
  });
});
