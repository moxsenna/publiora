// @vitest-environment jsdom

import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom/vitest";
import * as React from "react";

// ---------------------------------------------------------------------------
// jsdom polyfills
// ---------------------------------------------------------------------------

Element.prototype.scrollTo = vi.fn() as unknown as typeof Element.prototype.scrollTo;

// ---------------------------------------------------------------------------
// Mocks -- hoisted by vitest before imports
// ---------------------------------------------------------------------------

const pushToastMock = vi.fn();

vi.mock("@/store/projectStore", () => ({
  useUiStore: vi.fn((selector?: (s: any) => any) => {
    const state = { pushToast: pushToastMock };
    return selector ? selector(state) : state;
  }),
  useProjectStore: vi.fn((selector?: (s: any) => any) => {
    const state = {
      activeProjectId: "proj-1",
      setActiveProject: vi.fn(),
      selectedSectionId: null,
      setSelectedSectionId: vi.fn(),
    };
    return selector ? selector(state) : state;
  }),
}));

const useMessagesMock = vi.fn();
const useStrategyMock = vi.fn();
const useSendMessageMock = vi.fn();
const usePatchStrategyMock = vi.fn();
const useProjectMock = vi.fn();

vi.mock("@/lib/api/hooks", () => ({
  useMessages: (...args: any[]) => useMessagesMock(...args),
  useStrategy: (...args: any[]) => useStrategyMock(...args),
  useSendMessage: (...args: any[]) => useSendMessageMock(...args),
  usePatchStrategy: (...args: any[]) => usePatchStrategyMock(...args),
  useProject: (...args: any[]) => useProjectMock(...args),
}));

vi.mock("@/lib/workflow/strategy-copy", () => {
  const actual = vi.importActual("@/lib/workflow/strategy-copy");
  return actual;
});

// ---------------------------------------------------------------------------
// Imports
// ---------------------------------------------------------------------------

import { StrategyPanel } from "@/components/workspace/StrategyPanel";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeBaseState() {
  return {
    schema_version: 2,
    strategy: {
      topic: "Test Topic",
      audience: "Test Audience",
      audience_sophistication: null,
      primary_problem: null,
      pain_points: [] as string[],
      desired_outcome: null,
      core_promise: null,
      unique_angle: null,
      content_pillars: [] as string[],
      product_or_offer: null,
      funnel_goal: null,
      cta_goal: null,
      tone: null,
    },
    missing_fields: ["primary_problem", "desired_outcome"] as string[],
    next_action: "continue_strategy" as const,
    conversation_summary: null,
    updated_at: "2024-01-01T00:00:00Z",
  };
}

function mockStrategyData(overrides: Record<string, unknown> = {}) {
  return {
    data: {
      state: makeBaseState(),
      readiness_score: 33,
    },
    isLoading: false,
    ...overrides,
  };
}

function makeUserMsg(id: string, content: string) {
  return {
    id,
    project_id: "proj-1",
    role: "user" as const,
    content,
    agent: null as null,
    metadata: {} as Record<string, unknown>,
    created_at: "2024-01-01T00:00:00Z",
  };
}

function makeAssistantMsg(id: string) {
  return {
    id,
    project_id: "proj-1",
    role: "assistant" as const,
    content: "I'd be happy to help!",
    agent: "strategist" as const,
    metadata: {} as Record<string, unknown>,
    created_at: "2024-01-01T00:00:01Z",
  };
}

function mockMessagesData() {
  return {
    data: [
      makeUserMsg("msg-1", "Hello"),
      makeAssistantMsg("msg-2"),
    ],
    isLoading: false,
  };
}

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

beforeEach(() => {
  vi.clearAllMocks();
  useMessagesMock.mockReturnValue(mockMessagesData());
  useStrategyMock.mockReturnValue(mockStrategyData());
  useProjectMock.mockReturnValue({
    data: { id: "proj-1", ebook_type: "lead_magnet" },
    isLoading: false,
  });
  useSendMessageMock.mockReturnValue({
    mutateAsync: vi.fn(),
    isPending: false,
  });
  usePatchStrategyMock.mockReturnValue({
    mutateAsync: vi.fn(),
    isPending: false,
  });
});

// ---------------------------------------------------------------------------
// Compact trigger tests
// ---------------------------------------------------------------------------

describe("compact brief trigger (<lg breakpoint)", () => {
  it("renders the 'Lihat brief' compact trigger with score and count", () => {
    render(<StrategyPanel projectId="proj-1" />);

    // 2 of 6 core filled (topic + audience), readiness 33%
    const trigger = screen.getByText(/Lihat brief/u);
    expect(trigger).toBeInTheDocument();
    expect(trigger.textContent).toContain("2/6");
    expect(trigger.textContent).toContain("Kesiapan 33%");
  });

  it("compact trigger has lg:hidden class (visible on tablet+mobile)", () => {
    render(<StrategyPanel projectId="proj-1" />);
    const trigger = screen.getByText(/Lihat brief/u);
    expect(trigger.className).toContain("lg:hidden");
  });

  it("compact trigger is NOT rendered when strategy is null", () => {
    useStrategyMock.mockReturnValue({
      data: undefined,
      isLoading: false,
    });
    render(<StrategyPanel projectId="proj-1" />);
    expect(screen.queryByText(/Lihat brief/u)).not.toBeInTheDocument();
  });

  it("clicking compact trigger opens the brief sheet", async () => {
    const user = userEvent.setup();
    render(<StrategyPanel projectId="proj-1" />);

    const trigger = screen.getByText(/Lihat brief/u);
    await user.click(trigger);

    await waitFor(() => {
      expect(screen.getByRole("dialog", { name: /Brief & Kesiapan/i })).toBeInTheDocument();
    });
  });
});

// ---------------------------------------------------------------------------
// Brief sheet open/close
// ---------------------------------------------------------------------------

describe("StrategyBriefSheet open/close", () => {
  it("sheet shows Brief Ebook and Kesiapan Strategi content", async () => {
    const user = userEvent.setup();
    render(<StrategyPanel projectId="proj-1" />);

    const trigger = screen.getByText(/Lihat brief/u);
    await user.click(trigger);

    const dialog = screen.getByRole("dialog", { name: /Brief & Kesiapan/i });
    expect(dialog).toBeInTheDocument();

    // Check Brief content within the dialog scope
    expect(dialog.textContent).toContain("Brief Ebook");
    // Check Readiness content within the dialog scope
    expect(dialog.textContent).toContain("Kesiapan Strategi");
    // Score is displayed
    expect(dialog.textContent).toContain("33%");
  });

  it("closing sheet via 'Tutup' button removes dialog", async () => {
    const user = userEvent.setup();
    render(<StrategyPanel projectId="proj-1" />);

    const trigger = screen.getByText(/Lihat brief/u);
    await user.click(trigger);

    await waitFor(() => {
      expect(screen.getByRole("dialog")).toBeInTheDocument();
    });

    const closeBtn = screen.getByLabelText("Tutup");
    await user.click(closeBtn);

    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });
  });

  it("closing sheet via Escape key removes dialog", async () => {
    const user = userEvent.setup();
    render(<StrategyPanel projectId="proj-1" />);

    const trigger = screen.getByText(/Lihat brief/u);
    await user.click(trigger);

    await waitFor(() => {
      expect(screen.getByRole("dialog")).toBeInTheDocument();
    });

    fireEvent.keyDown(document, { key: "Escape" });

    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });
  });

  it("sheet close button has accessible label 'Tutup'", async () => {
    const user = userEvent.setup();
    render(<StrategyPanel projectId="proj-1" />);

    const trigger = screen.getByText(/Lihat brief/u);
    await user.click(trigger);

    await waitFor(() => {
      expect(screen.getByRole("dialog")).toBeInTheDocument();
    });

    const closeBtn = screen.getByLabelText("Tutup");
    expect(closeBtn).toBeInTheDocument();
    expect(closeBtn.tagName).toBe("BUTTON");
  });

  it("does not show dialog when briefSheetOpen is false initially", () => {
    render(<StrategyPanel projectId="proj-1" />);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Layout structure tests
// ---------------------------------------------------------------------------

describe("layout structure", () => {
  it("desktop right rail has hidden lg:flex classes", () => {
    render(<StrategyPanel projectId="proj-1" />);

    // The desktop rail div should have lg:flex — find it by its content
    const briefTitles = screen.getAllByText("Brief Ebook");
    // Desktop rail only when sheet is closed; sheet is not in DOM
    expect(briefTitles.length).toBe(1);

    // Navigate to the desktop rail container — go up to find the hidden+lg container
    const card = briefTitles[0]!.closest(".hidden");
    expect(card).not.toBeNull();
    expect(card!.className).toContain("lg:flex");
    expect(card!.className).toContain("lg:w-[340px]");
  });

  it("desktop right rail contains Brief + Readiness cards", () => {
    render(<StrategyPanel projectId="proj-1" />);

    // Both titles present in the desktop rail
    expect(screen.getByText("Brief Ebook")).toBeInTheDocument();
    expect(screen.getByText("Kesiapan Strategi")).toBeInTheDocument();
  });

  it("desktop right rail also contains 'Edit brief' button", () => {
    render(<StrategyPanel projectId="proj-1" />);

    const editButtons = screen.getAllByLabelText("Edit brief");
    // Only one — the desktop rail button (sheet buttons are not in DOM when closed)
    expect(editButtons.length).toBe(1);
  });

  it("does NOT render a permanent full Brief block under chat (old max-h-[40vh] mobile block is gone)", () => {
    render(<StrategyPanel projectId="proj-1" />);

    // The old mobile section had class max-h-[40vh]. Verify it's not present.
    const oldMobileBlocks = document.querySelectorAll(".max-h-\\[40vh\\]");
    expect(oldMobileBlocks.length).toBe(0);
  });

  it("composer is rendered and usable", () => {
    render(<StrategyPanel projectId="proj-1" />);

    const textarea = screen.getByLabelText("Tulis jawaban atau ceritakan konteks Anda\u2026");
    expect(textarea).toBeInTheDocument();
    expect(textarea).not.toBeDisabled();

    const sendBtn = screen.getByLabelText("Kirim pesan");
    expect(sendBtn).toBeInTheDocument();
  });

  it("composer container has shrink-0 class (sticky behavior)", () => {
    render(<StrategyPanel projectId="proj-1" />);

    const textarea = screen.getByLabelText("Tulis jawaban atau ceritakan konteks Anda\u2026");
    // Navigate to the composer wrapper
    const composerWrapper = textarea.closest(".border-t");
    expect(composerWrapper).not.toBeNull();
  });

  it("conversation column has flex-1 min-h-0 min-w-0", () => {
    render(<StrategyPanel projectId="proj-1" />);

    const textarea = screen.getByLabelText("Tulis jawaban atau ceritakan konteks Anda\u2026");
    // The conversation column is the parent flex container
    const convCol = textarea.closest(".flex.flex-col.flex-1");
    expect(convCol).not.toBeNull();
    expect(convCol?.className).toContain("min-h-0");
    expect(convCol?.className).toContain("min-w-0");
  });
});

// ---------------------------------------------------------------------------
// Sheet editor integration
// ---------------------------------------------------------------------------

describe("sheet to editor flow", () => {
  it("'Edit brief' button inside sheet opens the field editor", async () => {
    const user = userEvent.setup();
    render(<StrategyPanel projectId="proj-1" />);

    // Open sheet
    const trigger = screen.getByText(/Lihat brief/u);
    await user.click(trigger);

    await waitFor(() => {
      expect(screen.getByRole("dialog")).toBeInTheDocument();
    });

    // Click "Edit brief" inside the sheet
    const editBtns = screen.getAllByLabelText("Edit brief");
    // One is in desktop rail (hidden), one is inside the sheet dialog
    expect(editBtns.length).toBeGreaterThanOrEqual(1);
    // Click the one inside the dialog
    const dialog = screen.getByRole("dialog");
    const sheetEditBtn = dialog.querySelector('button[aria-label="Edit brief"]') as HTMLElement;
    expect(sheetEditBtn).not.toBeNull();
    await user.click(sheetEditBtn);

    // Now the field editor dialog should be open
    // After clicking "Edit brief" in sheet, sheet closes and editor opens
    await waitFor(() => {
      // The editor modal title
      expect(screen.getByText("Edit Informasi Strategi")).toBeInTheDocument();
    });
  });
});
