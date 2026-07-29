// @vitest-environment jsdom

import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import * as React from "react";
import { EnhancementReviewDialog } from "@/components/workspace/EnhancementReviewDialog";

const suggestion = {
  action: "expand" as const,
  original_html: "<p>Asli</p>",
  suggested_html: "<p>Saran</p>",
  summary: "Lebih lengkap",
  original_word_count: 1,
  suggested_word_count: 1,
};

function renderDialog(overrides: Partial<React.ComponentProps<typeof EnhancementReviewDialog>> = {}) {
  const props: React.ComponentProps<typeof EnhancementReviewDialog> = {
    open: true,
    onClose: vi.fn(),
    suggestion,
    priorHtml: null,
    accepting: false,
    rejecting: false,
    regenerating: false,
    undoing: false,
    onAccept: vi.fn(),
    onReject: vi.fn(),
    onRegenerate: vi.fn(),
    onSessionUndo: vi.fn(),
    ...overrides,
  };
  render(<EnhancementReviewDialog {...props} />);
  return props;
}

describe("EnhancementReviewDialog", () => {
  it("menolak tanpa menerima saran", () => {
    const props = renderDialog();
    fireEvent.click(screen.getByRole("button", { name: "Tolak" }));
    expect(props.onReject).toHaveBeenCalledOnce();
    expect(props.onAccept).not.toHaveBeenCalled();
  });

  it("menerima HTML saran persis setelah tindakan eksplisit", () => {
    const props = renderDialog();
    expect(props.onAccept).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Terapkan" }));
    expect(props.onAccept).toHaveBeenCalledWith("<p>Saran</p>");
  });

  it("menjaga dialog dan undo sesi tetap dapat dijangkau", () => {
    const props = renderDialog({
      priorHtml: "<p>Sebelum diterapkan</p>",
      error: "Terjadi kesalahan. Silakan coba lagi.",
    });
    expect(screen.getByText("Terjadi kesalahan. Silakan coba lagi.")).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "Urungkan sesi" }));
    expect(props.onSessionUndo).toHaveBeenCalledOnce();
    expect(screen.getByRole("dialog")).toBeVisible();
  });
});
