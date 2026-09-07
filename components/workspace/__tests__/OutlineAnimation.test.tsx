// @vitest-environment jsdom

import * as React from "react";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { describe, it, expect, vi } from "vitest";
import { OutlineSectionCard } from "@/components/workspace/OutlineSectionCard";
import { OutlinePanel } from "@/components/workspace/OutlinePanel";

// Mock API hooks used by OutlinePanel
vi.mock("@/lib/api/hooks", () => ({
  useOutline: vi.fn(),
  useGenerateOutline: vi.fn(),
  useUpdateOutline: vi.fn(() => ({ mutateAsync: vi.fn() })),
  useApproveOutline: vi.fn(() => ({ mutateAsync: vi.fn() })),
  useStrategy: vi.fn(() => ({ data: null })),
  useGenerateTitles: vi.fn(() => ({ mutateAsync: vi.fn(), isPending: false })),
  useUpdateProject: vi.fn(() => ({ mutateAsync: vi.fn() })),
  useSuggestOutlineTitles: vi.fn(() => ({ mutateAsync: vi.fn() })),
}));

// Mock projectStore
vi.mock("@/store/projectStore", () => ({
  useUiStore: vi.fn((selector) =>
    selector({
      pushToast: vi.fn(),
    })
  ),
}));

describe("Outline Section Card Animations", () => {
  it("renders generating status with animated indicators", () => {
    render(
      <OutlineSectionCard
        section={{
          id: "sec-1",
          section_order: 1,
          title: "Bab 1: Pengenalan",
          key_points: ["Poin 1"],
          target_word_count: 500,
          generation_status: "generating",
        }}
        index={0}
        onUpdate={vi.fn()}
        onDelete={vi.fn()}
      />
    );
    const badge = screen.getByText(/menulis/i);
    expect(badge).toBeInTheDocument();
    // Indicator or pulse class is present
    const card = badge.closest("div[class*='border']");
    expect(card).not.toBeNull();
    expect(card?.className).toMatch(/animate-pulse-soft/);
  });

  it("does not apply pulse animation when status is not generating", () => {
    render(
      <OutlineSectionCard
        section={{
          id: "sec-2",
          position: 1,
          title: "Bab 2: Pembahasan",
          summary: "Ringkasan",
          key_points: ["Poin 1"],
          estimated_words: 500,
          status: "pending",
        }}
        index={0}
        onMove={vi.fn()}
        onChange={vi.fn()}
        onRemove={vi.fn()}
      />
    );
    const badge = screen.getByText(/belum ditulis/i);
    expect(badge).toBeInTheDocument();
    const card = badge.closest("div[class*='border']");
    expect(card?.className).not.toMatch(/animate-pulse-soft/);
  });
});

describe("OutlinePanel Generation Animation", () => {
  it("renders LoadingDots and 'Menyusun outline…' when outline generation is pending in empty state", async () => {
    const { useOutline, useGenerateOutline } = await import("@/lib/api/hooks");
    vi.mocked(useOutline).mockReturnValue({
      data: null,
      isLoading: false,
    } as any);
    vi.mocked(useGenerateOutline).mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: true,
    } as any);

    render(<OutlinePanel projectId="p-1" />);

    expect(screen.getByText(/menyusun outline…/i)).toBeInTheDocument();
    expect(screen.getByRole("status", { name: /memuat…/i })).toBeInTheDocument();
  });

  it("renders LoadingDots and 'Menyusun outline…' when regenerate is pending with existing outline", async () => {
    const { useOutline, useGenerateOutline } = await import("@/lib/api/hooks");
    vi.mocked(useOutline).mockReturnValue({
      data: {
        id: "out-1",
        project_id: "p-1",
        title: "Outline Title",
        description: "Outline Description",
        approved: false,
        approved_at: null,
        created_at: "2026-01-01",
        updated_at: "2026-01-01",
        sections: [
          {
            id: "sec-1",
            position: 1,
            title: "Sec 1",
            summary: "Summary 1",
            key_points: [],
            estimated_words: 500,
            status: "pending",
          },
        ],
      },
      isLoading: false,
    } as any);
    vi.mocked(useGenerateOutline).mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: true,
    } as any);

    render(<OutlinePanel projectId="p-1" />);

    expect(screen.getByText(/menyusun outline…/i)).toBeInTheDocument();
    expect(screen.getByRole("status", { name: /memuat…/i })).toBeInTheDocument();
  });
});
