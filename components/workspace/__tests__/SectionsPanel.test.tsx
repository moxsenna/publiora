// @vitest-environment jsdom

import * as React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { describe, it, expect, vi } from "vitest";
import { SectionsPanel } from "@/components/workspace/SectionsPanel";

const mockOutline = {
  id: "out-1",
  project_id: "proj-1",
  status: "approved",
  sections: [
    {
      id: "os-1",
      position: 1,
      title: "Bab 1: Fondasi Ebook",
      summary: "Menjelaskan konsep dasar dan latar belakang.",
      key_points: ["Poin A", "Poin B"],
      estimated_words: 800,
    },
    {
      id: "os-2",
      position: 2,
      title: "Bab 2: Strategi Praktis",
      summary: "Langkah-langkah taktis implementasi.",
      key_points: ["Poin C"],
      estimated_words: 900,
    },
  ],
};

const mockMutateAsync = vi.fn();

vi.mock("@/lib/api/hooks", () => ({
  useOutline: vi.fn(() => ({ data: mockOutline })),
  useSections: vi.fn(() => ({ data: [], isLoading: false })),
  useGenerateSection: vi.fn(() => ({
    mutateAsync: mockMutateAsync,
    isPending: false,
  })),
  useUpdateSection: vi.fn(() => ({ mutateAsync: vi.fn(), isPending: false })),
  useEnhanceSection: vi.fn(() => ({ mutateAsync: vi.fn(), isPending: false })),
  useCreditBalance: vi.fn(() => ({ data: { balance: 50 } })),
  useCreditCosts: vi.fn(() => ({ data: { section_generate: 1 } })),
}));

vi.mock("@/store/projectStore", () => ({
  useUiStore: vi.fn((selector) =>
    selector({
      pushToast: vi.fn(),
    })
  ),
}));

describe("SectionsPanel Stage 3 UI/UX", () => {
  it("renders the unwritten section action brief card with summary, target words, and generate button", () => {
    render(<SectionsPanel projectId="proj-1" />);

    // Check heading for active outline section
    expect(
      screen.getByRole("heading", { name: "Bab 1: Fondasi Ebook" })
    ).toBeInTheDocument();
    expect(
      screen.getByText("Menjelaskan konsep dasar dan latar belakang.")
    ).toBeInTheDocument();
    expect(screen.getByText("Poin A")).toBeInTheDocument();
    expect(screen.getByText("Poin B")).toBeInTheDocument();

    // Check target word count and credit cost
    expect(screen.getByText("~800 kata")).toBeInTheDocument();
    expect(screen.getByText("1 Kredit AI")).toBeInTheDocument();

    // Check primary action button
    const generateBtn = screen.getByRole("button", {
      name: /Tulis Section Ini Sekarang/i,
    });
    expect(generateBtn).toBeInTheDocument();
  });

  it("switches active outline section preview when clicking another section in the list", () => {
    render(<SectionsPanel projectId="proj-1" />);

    // Initially Bab 1 is active
    expect(screen.getByText("Section 1 dari 2")).toBeInTheDocument();

    // Click Bab 2 in the section list
    const bab2Buttons = screen.getAllByRole("button", {
      name: /Bab 2: Strategi Praktis/i,
    });
    fireEvent.click(bab2Buttons[0]);

    // Now Bab 2 details should be displayed in the action brief
    expect(screen.getByText("Section 2 dari 2")).toBeInTheDocument();
    expect(
      screen.getByText("Langkah-langkah taktis implementasi.")
    ).toBeInTheDocument();
    expect(screen.getByText("Poin C")).toBeInTheDocument();
    expect(screen.getByText("~900 kata")).toBeInTheDocument();
  });

  it("calls generate.mutateAsync when clicking Tulis Section button", () => {
    render(<SectionsPanel projectId="proj-1" />);

    const generateBtn = screen.getByRole("button", {
      name: /Tulis Section Ini Sekarang/i,
    });
    fireEvent.click(generateBtn);

    expect(mockMutateAsync).toHaveBeenCalledWith({
      projectId: "proj-1",
      outlineSectionId: "os-1",
      confirmReplaceExisting: false,
    });
  });

  it("toggles mobile section picker listbox on button click", () => {
    render(<SectionsPanel projectId="proj-1" />);

    const pickerBtn = screen.getByRole("button", { name: /Pilih section/i });
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();

    fireEvent.click(pickerBtn);
    expect(screen.getByRole("listbox")).toBeInTheDocument();

    // Close using Tutup button inside listbox
    const closeBtn = screen.getByRole("button", { name: /Tutup/i });
    fireEvent.click(closeBtn);
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  });
});
