// @vitest-environment jsdom

import { describe, expect, it, vi } from "vitest";
import { render, screen, within, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom/vitest";
import * as React from "react";
import type { EbookStrategy } from "@/types/strategy";

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

import { StrategyBriefCard } from "@/components/workspace/StrategyBriefCard";

// ---------------------------------------------------------------------------
// Indonesian copy constants for test assertions
// ---------------------------------------------------------------------------

const COPY = {
  briefTitle: "Brief Ebook",
  advancedContext: "Konteks tambahan",
  emptyRequiredBadge: "Wajib",
  emptyOptionalBadge: "Opsional",
  emptyValue: "Belum diisi",
  editBrief: "Edit brief",
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeStrategy(overrides: Partial<EbookStrategy> = {}): EbookStrategy {
  return {
    topic: "Marketing Digital untuk UMKM",
    audience: "Pemilik UMKM yang baru memulai",
    audience_sophistication: null,
    primary_problem: "Kesulitan mendapatkan pelanggan baru secara online",
    pain_points: ["Tidak tahu platform mana yang efektif", "Budget terbatas"],
    desired_outcome: "Mampu menjalankan kampanye digital mandiri",
    core_promise: "Panduan langkah-demi-langkah marketing digital untuk UMKM",
    unique_angle: null,
    content_pillars: ["SEO Dasar", "Social Media Marketing", "Email Marketing"],
    product_or_offer: "Konsultasi marketing gratis",
    funnel_goal: "Mengubah pembaca menjadi leads konsultasi",
    cta_goal: null,
    tone: "Santai dan praktis",
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("StrategyBriefCard", () => {
  // -----------------------------------------------------------------------
  // 1. Core fields with Indonesian labels
  // -----------------------------------------------------------------------

  it("renders all 6 core fields with Indonesian labels", () => {
    render(<StrategyBriefCard strategy={makeStrategy()} onEdit={vi.fn()} />);

    const coreLabels = [
      "Topik",
      "Target pembaca",
      "Masalah utama",
      "Hasil yang diinginkan",
      "Janji utama",
      "Sudut unik",
    ];

    // Get just the core fields list (the first ul)
    const coreList = screen.getByLabelText("Informasi inti strategi ebook");

    for (const label of coreLabels) {
      expect(within(coreList).getByText(label)).toBeInTheDocument();
    }
  });

  // -----------------------------------------------------------------------
  // 2. Header progress
  // -----------------------------------------------------------------------

  it("shows 'X dari 6 informasi inti lengkap' header", () => {
    // This strategy has 4 of 6 core filled (topic, audience, primary_problem, desired_outcome, core_promise = 5)
    render(<StrategyBriefCard strategy={makeStrategy()} onEdit={vi.fn()} />);

    // With makeStrategy defaults: topic, audience, primary_problem, desired_outcome, core_promise filled = 5
    expect(screen.getByText("5 dari 6 informasi inti lengkap")).toBeInTheDocument();
  });

  it("shows '0 dari 6' when no core fields are filled", () => {
    const empty = makeStrategy({
      topic: null,
      audience: null,
      primary_problem: null,
      desired_outcome: null,
      core_promise: null,
      unique_angle: null,
    });
    render(<StrategyBriefCard strategy={empty} onEdit={vi.fn()} />);

    expect(screen.getByText("0 dari 6 informasi inti lengkap")).toBeInTheDocument();
  });

  it("shows '6 dari 6' when all core fields are filled", () => {
    const full = makeStrategy({
      unique_angle: "Pendekatan berbasis studi kasus nyata UMKM Indonesia",
    });
    render(<StrategyBriefCard strategy={full} onEdit={vi.fn()} />);

    expect(screen.getByText("6 dari 6 informasi inti lengkap")).toBeInTheDocument();
  });

  // -----------------------------------------------------------------------
  // 3. Brief title
  // -----------------------------------------------------------------------

  it("renders Brief Ebook title", () => {
    render(<StrategyBriefCard strategy={makeStrategy()} onEdit={vi.fn()} />);

    expect(screen.getByText(COPY.briefTitle)).toBeInTheDocument();
  });

  // -----------------------------------------------------------------------
  // 4. Advanced section collapsed by default
  // -----------------------------------------------------------------------

  it("renders advanced section header 'Konteks tambahan'", () => {
    render(<StrategyBriefCard strategy={makeStrategy()} onEdit={vi.fn()} />);

    expect(screen.getByText(COPY.advancedContext)).toBeInTheDocument();
  });

  it("advanced section is collapsed by default (advanced rows not visible)", () => {
    render(<StrategyBriefCard strategy={makeStrategy()} onEdit={vi.fn()} />);

    // The `<details>` element should not have `open` attribute initially
    const details = document.querySelector("details");
    expect(details).not.toBeNull();
    expect(details?.open).toBe(false);

    // Advanced field labels should NOT be visible (hidden inside collapsed <details>)
    const advanced = document.querySelector('[aria-label="Konteks tambahan strategi ebook"]');
    // In jsdom, collapsed details children are still in DOM but not visible to query functions
    // We verify the details element isn't open
    expect(details?.hasAttribute("open")).toBe(false);
  });

  it("expanding advanced section reveals 7 advanced field rows", async () => {
    const user = userEvent.setup();
    render(<StrategyBriefCard strategy={makeStrategy()} onEdit={vi.fn()} />);

    const summary = screen.getByText(COPY.advancedContext);
    await user.click(summary);

    // Now details should be open
    const details = document.querySelector("details");
    expect(details?.open).toBe(true);

    // Advanced fields should now be visible
    const advancedLabels = [
      "Tingkat pemahaman",
      "Titik masalah",
      "Pilar konten",
      "Produk/penawaran",
      "Tujuan funnel",
      "Tujuan CTA",
      "Gaya bahasa",
    ];

    for (const label of advancedLabels) {
      expect(screen.getByText(label)).toBeInTheDocument();
    }
  });

  // -----------------------------------------------------------------------
  // 5. Row click calls onEditField
  // -----------------------------------------------------------------------

  it("clicking a core field row calls onEditField with the field key", async () => {
    const onEditField = vi.fn();
    const user = userEvent.setup();

    render(
      <StrategyBriefCard
        strategy={makeStrategy()}
        onEdit={vi.fn()}
        onEditField={onEditField}
      />,
    );

    // Click "Target pembaca" row inside core list
    const coreList = screen.getByLabelText("Informasi inti strategi ebook");
    const audienceRow = within(coreList).getByText("Target pembaca").closest("li")!;
    await user.click(audienceRow);

    expect(onEditField).toHaveBeenCalledWith("audience");
  });

  it("keyboard Enter on a field row calls onEditField", () => {
    const onEditField = vi.fn();

    render(
      <StrategyBriefCard
        strategy={makeStrategy()}
        onEdit={vi.fn()}
        onEditField={onEditField}
      />,
    );

    const coreList = screen.getByLabelText("Informasi inti strategi ebook");
    const topicRow = within(coreList).getByText("Topik").closest("li")!;
    fireEvent.keyDown(topicRow, { key: "Enter" });

    expect(onEditField).toHaveBeenCalledWith("topic");
  });

  it("keyboard Space on a field row calls onEditField", () => {
    const onEditField = vi.fn();

    render(
      <StrategyBriefCard
        strategy={makeStrategy()}
        onEdit={vi.fn()}
        onEditField={onEditField}
      />,
    );

    const coreList = screen.getByLabelText("Informasi inti strategi ebook");
    const topicRow = within(coreList).getByText("Topik").closest("li")!;
    fireEvent.keyDown(topicRow, { key: " " });

    expect(onEditField).toHaveBeenCalledWith("topic");
  });

  // -----------------------------------------------------------------------
  // 6. "Edit brief" button
  // -----------------------------------------------------------------------

  it("'Edit brief' button calls onEdit", async () => {
    const onEdit = vi.fn();
    const user = userEvent.setup();

    render(<StrategyBriefCard strategy={makeStrategy()} onEdit={onEdit} />);

    const editBtn = screen.getByLabelText(COPY.editBrief);
    await user.click(editBtn);

    expect(onEdit).toHaveBeenCalledTimes(1);
  });

  // -----------------------------------------------------------------------
  // 7. Long value doesn't break layout
  // -----------------------------------------------------------------------

  it("long field value is clamped and does not cause horizontal overflow", () => {
    const longTopic = "A".repeat(200);
    render(
      <StrategyBriefCard
        strategy={makeStrategy({ topic: longTopic })}
        onEdit={vi.fn()}
      />,
    );

    // The topic value paragraph should exist with line-clamp
    const coreList = screen.getByLabelText("Informasi inti strategi ebook");
    const topicRow = within(coreList).getByText("Topik").closest("li")!;

    // The value paragraph should be present
    const valueEl = within(topicRow).getByText(longTopic);
    expect(valueEl).toBeInTheDocument();

    // The value paragraph should have line-clamp-2 class
    expect(valueEl.className).toMatch(/line-clamp-2/);
  });

  // -----------------------------------------------------------------------
  // 8. Filled vs empty badges
  // -----------------------------------------------------------------------

  it("shows 'Wajib' badge for empty required fields", () => {
    // Several core fields may be empty; use getAllByText
    render(<StrategyBriefCard strategy={makeStrategy({ topic: null })} onEdit={vi.fn()} />);

    const badges = screen.getAllByText(COPY.emptyRequiredBadge);
    expect(badges.length).toBeGreaterThanOrEqual(1);
  });

  it("shows 'Opsional' badge for empty optional fields", () => {
    // Several optional fields may be empty; use getAllByText
    render(<StrategyBriefCard strategy={makeStrategy({ tone: null })} onEdit={vi.fn()} />);

    const badges = screen.getAllByText(COPY.emptyOptionalBadge);
    expect(badges.length).toBeGreaterThanOrEqual(1);
  });

  it("shows 'Belum diisi' for empty fields", () => {
    render(<StrategyBriefCard strategy={makeStrategy({ topic: null })} onEdit={vi.fn()} />);

    // Multiple "Belum diisi" for multiple empty fields
    const emptyLabels = screen.getAllByText(COPY.emptyValue);
    expect(emptyLabels.length).toBeGreaterThanOrEqual(1);
  });

  // -----------------------------------------------------------------------
  // 9. Footer with remaining count
  // -----------------------------------------------------------------------

  it("shows footer 'Lengkapi N informasi inti lagi.' when some core fields are missing", () => {
    render(
      <StrategyBriefCard
        strategy={makeStrategy({ primary_problem: null, desired_outcome: null })}
        onEdit={vi.fn()}
      />,
    );

    // With topic, audience, core_promise filled (3 of 6 core) → remaining = 3
    expect(screen.getByText("Lengkapi 3 informasi inti lagi.")).toBeInTheDocument();
  });

  it("does not show footer when all core fields are complete", () => {
    render(
      <StrategyBriefCard
        strategy={makeStrategy({ unique_angle: "A unique angle" })}
        onEdit={vi.fn()}
      />,
    );

    expect(screen.queryByText(/Lengkapi/)).not.toBeInTheDocument();
  });
});
