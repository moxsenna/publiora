// @vitest-environment jsdom

import * as React from "react";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { describe, expect, it, vi } from "vitest";
import { ReviewChecklist } from "@/components/workspace/ReviewChecklist";
import { getReviewCheckCopy, getBlockerMessage } from "@/lib/i18n/id/review";
import type { WorkflowCheck } from "@/types/workflow";

describe("Enhanced ReviewChecklist and quality mapping", () => {
  it("maps under_target_words and other quality issues to Indonesian copy", () => {
    const copy = getReviewCheckCopy({
      id: "under_target_words_sec-1",
      code: "under_target_words",
    });
    expect(copy.title).toBe("Panjang kata di bawah target");
    expect(copy.description).toContain("Tambahkan langkah praktis");

    const copyOpening = getReviewCheckCopy({
      id: "opening_too_similar_to_previous_sec-2",
      code: "opening_too_similar_to_previous",
    });
    expect(copyOpening.title).toBe("Pembukaan terlalu mirip bagian sebelumnya");
  });

  it("renders section badge and section-specific action button", () => {
    const checks: WorkflowCheck[] = [
      {
        id: "under_target_words_sec-1",
        code: "under_target_words",
        severity: "warning",
        category: "content",
        targetStep: "write",
        section_id: "sec-1",
      },
    ];

    const sections = [
      { id: "sec-1", title: "Dasar Investasi", position: 1 },
    ];

    render(
      <ReviewChecklist
        checks={checks}
        sections={sections}
        onNavigateCheck={vi.fn()}
      />
    );

    expect(screen.getByText("Peringatan")).toBeInTheDocument();
    expect(screen.getByText("Bab 1: Dasar Investasi")).toBeInTheDocument();
    expect(screen.getByText("Panjang kata di bawah target")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Buka Dasar Investasi/i })).toBeInTheDocument();
  });

  it("maps blocker messages for footer in Indonesian", () => {
    expect(
      getBlockerMessage({
        code: "cta_text_empty",
        message: "Enter CTA text before publishing.",
      })
    ).toBe("Isi teks CTA sebelum menerbitkan.");

    expect(
      getBlockerMessage({
        code: "cta_url_invalid",
        message: "The CTA URL is not valid.",
      })
    ).toBe("URL tujuan CTA tidak valid.");
  });
});
