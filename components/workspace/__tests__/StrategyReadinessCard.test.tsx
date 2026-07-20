// @vitest-environment jsdom

import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom/vitest";
import * as React from "react";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock("@/lib/workflow/strategy-copy", () => {
  const actual = vi.importActual("@/lib/workflow/strategy-copy");
  return actual;
});

// ---------------------------------------------------------------------------
// Imports
// ---------------------------------------------------------------------------

import { StrategyReadinessCard } from "@/components/workspace/StrategyReadinessCard";

// ---------------------------------------------------------------------------
// Indonesian copy constants for test assertions
// ---------------------------------------------------------------------------

const COPY = {
  readinessTitle: "Kesiapan Strategi",
  missingSectionTitle: "Yang masih kurang",
  allComplete: "Semua informasi inti sudah lengkap.",
  createOutline: "Buat struktur ebook",
  openOutline: "Buka struktur ebook",
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function defaultProps(overrides: Record<string, unknown> = {}) {
  return {
    readinessScore: 50,
    missingFields: ["primary_problem", "desired_outcome", "core_promise", "unique_angle"],
    nextAction: "continue_strategy" as const,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("StrategyReadinessCard", () => {
  // -----------------------------------------------------------------------
  // 1. Score bucket labels
  // -----------------------------------------------------------------------

  it("shows 'Baru dimulai' for score < 40", () => {
    render(<StrategyReadinessCard {...defaultProps({ readinessScore: 25 })} />);
    expect(screen.getByText("Baru dimulai")).toBeInTheDocument();
  });

  it("shows 'Perlu dilengkapi' for score 40-69", () => {
    render(<StrategyReadinessCard {...defaultProps({ readinessScore: 55 })} />);
    expect(screen.getByText("Perlu dilengkapi")).toBeInTheDocument();
  });

  it("shows 'Siap membuat struktur' for score 70-89", () => {
    render(<StrategyReadinessCard {...defaultProps({ readinessScore: 75 })} />);
    expect(screen.getByText("Siap membuat struktur")).toBeInTheDocument();
  });

  it("shows 'Sangat siap' for score >= 90", () => {
    render(<StrategyReadinessCard {...defaultProps({ readinessScore: 95 })} />);
    expect(screen.getByText("Sangat siap")).toBeInTheDocument();
  });

  // -----------------------------------------------------------------------
  // 2. Card title
  // -----------------------------------------------------------------------

  it("renders readiness title", () => {
    render(<StrategyReadinessCard {...defaultProps()} />);
    expect(screen.getByText(COPY.readinessTitle)).toBeInTheDocument();
  });

  // -----------------------------------------------------------------------
  // 3. Missing list: max 3 + overflow "+N lainnya"
  // -----------------------------------------------------------------------

  it("shows at most 3 missing fields plus overflow count", () => {
    // 4 missing fields → show 3 + "+1 lainnya"
    render(<StrategyReadinessCard {...defaultProps()} />);

    // Should have short labels for the 3 visible fields
    // The default missing fields: primary_problem, desired_outcome, core_promise, unique_angle
    expect(screen.getByText("Masalah utama")).toBeInTheDocument();
    expect(screen.getByText("Hasil yang diinginkan")).toBeInTheDocument();
    expect(screen.getByText("Janji utama")).toBeInTheDocument();

    // Overflow count
    expect(screen.getByText("+1 lainnya")).toBeInTheDocument();

    // The 4th field (unique_angle) should NOT be shown
    expect(screen.queryByText("Sudut unik")).not.toBeInTheDocument();
  });

  it("shows all missing fields when 3 or fewer without overflow", () => {
    render(
      <StrategyReadinessCard
        {...defaultProps({
          missingFields: ["primary_problem", "desired_outcome"],
        })}
      />,
    );

    expect(screen.getByText("Masalah utama")).toBeInTheDocument();
    expect(screen.getByText("Hasil yang diinginkan")).toBeInTheDocument();

    // No overflow
    expect(screen.queryByText(/lainnya/)).not.toBeInTheDocument();
  });

  it("shows +N lainnya with correct count for many missing fields", () => {
    render(
      <StrategyReadinessCard
        {...defaultProps({
          missingFields: [
            "topic",
            "audience",
            "primary_problem",
            "desired_outcome",
            "core_promise",
            "unique_angle",
          ],
        })}
      />,
    );

    // 3 visible + "+3 lainnya"
    expect(screen.getByText("+3 lainnya")).toBeInTheDocument();
  });

  // -----------------------------------------------------------------------
  // 4. All complete state
  // -----------------------------------------------------------------------

  it("shows 'Semua informasi inti sudah lengkap.' when no missing fields", () => {
    render(
      <StrategyReadinessCard
        {...defaultProps({ missingFields: [] })}
      />,
    );

    expect(screen.getByText(COPY.allComplete)).toBeInTheDocument();
    expect(screen.queryByText(COPY.missingSectionTitle)).not.toBeInTheDocument();
  });

  // -----------------------------------------------------------------------
  // 5. Missing section title
  // -----------------------------------------------------------------------

  it("shows 'Yang masih kurang' section title when there are missing fields", () => {
    render(<StrategyReadinessCard {...defaultProps()} />);

    expect(screen.getByText(COPY.missingSectionTitle)).toBeInTheDocument();
  });

  // -----------------------------------------------------------------------
  // 6. continue_strategy: shows 'Lengkapi N informasi inti lagi.' no CTA button
  // -----------------------------------------------------------------------

  it("shows 'Lengkapi N informasi inti lagi.' when next_action is continue_strategy", () => {
    render(
      <StrategyReadinessCard
        {...defaultProps({
          nextAction: "continue_strategy",
          missingFields: ["primary_problem", "desired_outcome"],
        })}
      />,
    );

    // 2 missing → "Lengkapi 2 informasi inti lagi."
    expect(screen.getByText("Lengkapi 2 informasi inti lagi.")).toBeInTheDocument();

    // No CTA button
    expect(screen.queryByText(COPY.createOutline)).not.toBeInTheDocument();
    expect(screen.queryByText(COPY.openOutline)).not.toBeInTheDocument();
  });

  it("does not show CTA or footer when continue_strategy with no missing fields (edge case)", () => {
    render(
      <StrategyReadinessCard
        {...defaultProps({
          nextAction: "continue_strategy",
          missingFields: [],
        })}
      />,
    );

    // Should show all-complete, not footer or button
    expect(screen.getByText(COPY.allComplete)).toBeInTheDocument();
    expect(screen.queryByText(/Lengkapi/)).not.toBeInTheDocument();
    expect(screen.queryByText(COPY.createOutline)).not.toBeInTheDocument();
  });

  // -----------------------------------------------------------------------
  // 7. create_outline: shows 'Buat struktur ebook' button
  // -----------------------------------------------------------------------

  it("shows 'Buat struktur ebook' button when next_action is create_outline", () => {
    render(
      <StrategyReadinessCard
        {...defaultProps({
          nextAction: "create_outline",
          missingFields: [],
          readinessScore: 80,
        })}
      />,
    );

    // Both next_action label and the CTA button show "Buat struktur ebook"
    const elements = screen.getAllByText(COPY.createOutline);
    expect(elements.length).toBeGreaterThanOrEqual(1);

    // At least one of these should be a button element
    const button = elements.find(
      (el) => el.tagName === "BUTTON"
    );
    expect(button).toBeDefined();

    expect(screen.queryByText(COPY.openOutline)).not.toBeInTheDocument();
  });

  it("clicking 'Buat struktur ebook' calls onRequestOutline", async () => {
    const onRequestOutline = vi.fn();
    const user = userEvent.setup();

    render(
      <StrategyReadinessCard
        {...defaultProps({
          nextAction: "create_outline",
          missingFields: [],
          onRequestOutline,
        })}
      />,
    );

    // Find the button element specifically
    const buttons = screen.getAllByText(COPY.createOutline);
    const btn = buttons.find((el) => el.tagName === "BUTTON")!;
    await user.click(btn);

    expect(onRequestOutline).toHaveBeenCalledTimes(1);
  });

  // -----------------------------------------------------------------------
  // 8. review_outline / start_writing: shows 'Buka struktur ebook' button
  // -----------------------------------------------------------------------

  it("shows 'Buka struktur ebook' button when next_action is review_outline", () => {
    render(
      <StrategyReadinessCard
        {...defaultProps({
          nextAction: "review_outline",
          missingFields: [],
          readinessScore: 90,
        })}
      />,
    );

    expect(screen.getByText(COPY.openOutline)).toBeInTheDocument();
    expect(screen.queryByText(COPY.createOutline)).not.toBeInTheDocument();
  });

  it("shows 'Buka struktur ebook' button when next_action is start_writing", () => {
    render(
      <StrategyReadinessCard
        {...defaultProps({
          nextAction: "start_writing",
          missingFields: [],
          readinessScore: 95,
        })}
      />,
    );

    expect(screen.getByText(COPY.openOutline)).toBeInTheDocument();
    expect(screen.queryByText(COPY.createOutline)).not.toBeInTheDocument();
  });

  it("clicking 'Buka struktur ebook' calls onRequestOutline", async () => {
    const onRequestOutline = vi.fn();
    const user = userEvent.setup();

    render(
      <StrategyReadinessCard
        {...defaultProps({
          nextAction: "review_outline",
          missingFields: [],
          onRequestOutline,
        })}
      />,
    );

    const btn = screen.getByText(COPY.openOutline);
    await user.click(btn);

    expect(onRequestOutline).toHaveBeenCalledTimes(1);
  });

  // -----------------------------------------------------------------------
  // 9. No horizontal overflow on long missing field labels
  // -----------------------------------------------------------------------

  it("does not cause layout overflow with long missing field labels", () => {
    // Use a real short label that's long: "Titik masalah pembaca" is one of the longest
    render(
      <StrategyReadinessCard
        {...defaultProps({
          missingFields: ["pain_points"],
        })}
      />,
    );

    const label = screen.getByText("Titik masalah pembaca");
    expect(label).toBeInTheDocument();

    // Smoke check: label should have break-words class
    expect(label.className).toMatch(/break-words/);
  });

  // -----------------------------------------------------------------------
  // 10. Next action labels (Indonesian)
  // -----------------------------------------------------------------------

  it("shows 'Lanjutkan menyusun strategi' for continue_strategy", () => {
    render(<StrategyReadinessCard {...defaultProps({ nextAction: "continue_strategy" })} />);
    expect(screen.getByText("Lanjutkan menyusun strategi")).toBeInTheDocument();
  });

  it("shows 'Buat struktur ebook' for create_outline", () => {
    render(<StrategyReadinessCard {...defaultProps({ nextAction: "create_outline" })} />);
    // Both next_action label and CTA button show this text; verify at least one exists
    const elements = screen.getAllByText("Buat struktur ebook");
    expect(elements.length).toBeGreaterThanOrEqual(1);
    // Next-action label is in a span with font-medium, not a button
    const label = elements.find((el) => el.tagName === "SPAN");
    expect(label).toBeDefined();
  });

  it("shows 'Tinjau struktur' for review_outline", () => {
    render(<StrategyReadinessCard {...defaultProps({ nextAction: "review_outline" })} />);
    expect(screen.getByText("Tinjau struktur")).toBeInTheDocument();
  });

  it("shows 'Mulai menulis bagian' for start_writing", () => {
    render(<StrategyReadinessCard {...defaultProps({ nextAction: "start_writing" })} />);
    expect(screen.getByText("Mulai menulis bagian")).toBeInTheDocument();
  });

  // -----------------------------------------------------------------------
  // 11. ReadinessCard renders without optional props
  // -----------------------------------------------------------------------

  it("renders without onRequestOutline (optional prop)", () => {
    expect(() => {
      render(<StrategyReadinessCard {...defaultProps({ onRequestOutline: undefined })} />);
    }).not.toThrow();
  });

  // -----------------------------------------------------------------------
  // 12. create_outline button is disabled when no onRequestOutline handler
  // -----------------------------------------------------------------------

  it("create_outline button is disabled when onRequestOutline is not provided", () => {
    render(
      <StrategyReadinessCard
        {...defaultProps({
          nextAction: "create_outline",
          missingFields: [],
        })}
      />,
    );

    // Find the button element specifically (not the next_action label span)
    const elements = screen.getAllByText(COPY.createOutline);
    const btn = elements.find((el) => el.tagName === "BUTTON") as HTMLButtonElement;
    expect(btn).toBeDefined();
    expect(btn).toBeDisabled();
  });
});
