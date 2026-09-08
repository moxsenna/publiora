// @vitest-environment jsdom

import * as React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { ReviewPanel } from "@/components/workspace/ReviewPanel";
import { formatAiCategory, formatAiSeverity } from "@/components/workspace/AiQualityReview";
import type { ProjectWorkflowState } from "@/types/workflow";

vi.mock("@/lib/api/hooks", () => ({
  useProject: () => ({
    data: {
      id: "proj-1",
      title: "Rahasia Content Creator",
      subtitle: "1 Ide Jadi 5 Format",
      cta_goal: "custom",
      cta_url: "https://example.com",
      final_cta: "Dapatkan Sekarang",
    },
  }),
  useOutline: () => ({
    data: {
      sections: [
        { id: "sec-1", title: "Dasar Investasi", position: 1 },
      ],
    },
  }),
  useSections: () => ({
    data: [
      { id: "sec-1", title: "Dasar Investasi", position: 1, word_count: 500, status: "generated" },
    ],
  }),
  useUpdateProject: () => ({
    mutateAsync: vi.fn(),
    isPending: false,
  }),
  useCreditCosts: () => ({
    data: { quality_review: 3 },
  }),
  useGenerateTitles: () => ({
    mutateAsync: vi.fn(),
    isPending: false,
  }),
  useGenerateCtas: () => ({
    mutateAsync: vi.fn(),
    isPending: false,
  }),
}));

vi.mock("@/store/projectStore", () => ({
  useUiStore: (selector: any) =>
    selector({
      pushToast: vi.fn(),
    }),
}));

describe("ReviewPanel & AiQualityReview Enhanced", () => {
  const workflow: ProjectWorkflowState = {
    currentStep: "review",
    steps: {
      strategy: "completed",
      outline: "completed",
      write: "completed",
      review: "in_progress",
      publish: "blocked",
    },
    blockers: [],
    checks: [
      {
        id: "under_target_words_sec-1",
        code: "under_target_words",
        severity: "warning",
        category: "content",
        targetStep: "write",
        section_id: "sec-1",
      },
      {
        id: "cta_text_empty",
        code: "cta_text_empty",
        severity: "blocker",
        category: "cta",
        targetStep: "review",
        action_step: "review",
        action_label: "Atur CTA",
      },
    ],
    readyToPublish: false,
    updatedAt: new Date().toISOString(),
  };

  it("renders both review tabs and switches between system checklist and AI audit", () => {
    render(
      <ReviewPanel
        projectId="proj-1"
        workflow={workflow}
        onNavigate={vi.fn()}
        onContinueToPublish={vi.fn()}
      />
    );

    // Initial state: system checklist tab is active
    expect(screen.getByRole("button", { name: /Checklist Sistem/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Audit Redaksi AI/i })).toBeInTheDocument();
    expect(screen.getByText("Panjang kata di bawah target")).toBeInTheDocument();
    expect(screen.getByText("Teks CTA belum diisi")).toBeInTheDocument();

    // Click AI Audit tab
    fireEvent.click(screen.getByRole("button", { name: /Audit Redaksi AI/i }));

    // AI audit content should now be visible
    expect(screen.getByText("Audit Redaksi & Alur Naskah (AI)")).toBeInTheDocument();
    expect(screen.getByText(/Periksa kualitas dengan AI · 3 kredit/i)).toBeInTheDocument();
  });

  it("formats AI categories and severities in Indonesian", () => {
    expect(formatAiCategory("audience suitability")).toBe("Kesesuaian Audiens");
    expect(formatAiCategory("type/format mismatch")).toBe("Struktur & Format");
    expect(formatAiCategory("weak transitions")).toBe("Alur & Transisi");
    expect(formatAiCategory("repeated ideas")).toBe("Pengulangan Ide");

    const important = formatAiSeverity("important");
    expect(important.label).toBe("Prioritas Utama");
    expect(important.isImportant).toBe(true);

    const warning = formatAiSeverity("warning");
    expect(warning.label).toBe("Saran Perbaikan");
    expect(warning.isImportant).toBe(false);
  });

  it("renders desktop sidebar with readiness scorecard, preview info, and guide", () => {
    render(
      <ReviewPanel
        projectId="proj-1"
        workflow={workflow}
        onNavigate={vi.fn()}
        onContinueToPublish={vi.fn()}
      />
    );

    // Readiness Card
    expect(screen.getByText("Kesiapan Ebook")).toBeInTheDocument();
    expect(screen.getByText("Kendala")).toBeInTheDocument();
    expect(screen.getAllByText("Peringatan").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("Lolos")).toBeInTheDocument();

    // Preview Panel
    expect(screen.getByText("1 bab siap")).toBeInTheDocument();
    expect(screen.getByText(/Pratinjau sebagai pembaca/i)).toBeInTheDocument();

    // Guide
    expect(screen.getByText("Panduan Tahap Tinjau")).toBeInTheDocument();
  });
});
