// @vitest-environment jsdom

import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor, within, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom/vitest";
import * as React from "react";

// ---------------------------------------------------------------------------
// jsdom polyfills
// ---------------------------------------------------------------------------

// jsdom does not implement scrollTo; stub it so the auto-scroll effect runs.
Element.prototype.scrollTo = vi.fn() as unknown as typeof Element.prototype.scrollTo;

// ---------------------------------------------------------------------------
// Mocks -- hoisted by vitest before imports
// ---------------------------------------------------------------------------

const pushToastMock = vi.fn();
const sendMutateAsyncMock = vi.fn();
const patchMutateAsyncMock = vi.fn();

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

vi.mock("@/lib/api/hooks", () => ({
  useMessages: (...args: any[]) => useMessagesMock(...args),
  useStrategy: (...args: any[]) => useStrategyMock(...args),
  useSendMessage: (...args: any[]) => useSendMessageMock(...args),
  usePatchStrategy: (...args: any[]) => usePatchStrategyMock(...args),
}));

// Mock the centralized strategy copy so tests reference the same values
vi.mock("@/lib/workflow/strategy-copy", () => {
  const actual = vi.importActual("@/lib/workflow/strategy-copy");
  return actual;
});

// ---------------------------------------------------------------------------
// Indonesian copy constants (mirrors strategy-copy.ts values for test assertions)
// ---------------------------------------------------------------------------

const COPY = {
  assistantName: "Asisten Strategi",
  emptyTitle: "Mulai susun strategi ebook",
  composerPlaceholder: "Tulis jawaban atau ceritakan konteks Anda\u2026",
  sendAriaLabel: "Kirim pesan",
  sendError: "Pesan gagal dikirim.",
  sending: "Mengirim pesan\u2026",
  editBrief: "Edit brief",
  editorTitle: "Edit Informasi Strategi",
  editorCancel: "Batal",
  nextActionContinue: "Lanjutkan menyusun strategi",
  defaultSuggestions: [
    "Bantu saya menentukan masalah utama ebook",
    "Apa janji utama yang cocok untuk audiens ini?",
    "Sarankan pilar konten berdasarkan topik saya",
    "Sudut unik apa yang bisa saya gunakan?",
    "Bantu saya menentukan titik masalah dan hasil yang diinginkan",
  ],
  missingFieldPrompts: {
    primary_problem: "Bantu saya mengidentifikasi masalah utama",
    desired_outcome: "Hasil apa yang sebaiknya dicapai pembaca?",
  },
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function mockStrategyData(overrides: Record<string, unknown> = {}) {
  return {
    data: {
      state: {
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
      },
      readiness_score: 50,
    },
    isLoading: false,
    ...overrides,
  };
}

function mockMessagesData(overrides: Record<string, unknown> = {}) {
  return {
    data: [
      {
        id: "msg-1",
        project_id: "proj-1",
        role: "user" as const,
        content: "Hello, help me define my ebook strategy",
        agent: null,
        created_at: "2024-01-01T00:00:00Z",
      },
      {
        id: "msg-2",
        project_id: "proj-1",
        role: "assistant" as const,
        content: "I'd be happy to help! Let's start with your topic.",
        agent: "strategist" as const,
        created_at: "2024-01-01T00:00:01Z",
      },
    ],
    isLoading: false,
    ...overrides,
  };
}

function mockSendHook(overrides: Record<string, unknown> = {}) {
  return {
    mutateAsync: sendMutateAsyncMock,
    isPending: false,
    ...overrides,
  };
}

function mockPatchHook(overrides: Record<string, unknown> = {}) {
  return {
    mutateAsync: patchMutateAsyncMock,
    isPending: false,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Imports (after mocks so hoisted mocks take effect)
// ---------------------------------------------------------------------------

import { StrategyPanel } from "@/components/workspace/StrategyPanel";

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

beforeEach(() => {
  vi.clearAllMocks();

  // Default: strategy loaded with missing fields, messages with content
  useMessagesMock.mockReturnValue(mockMessagesData());
  useStrategyMock.mockReturnValue(mockStrategyData());
  useSendMessageMock.mockReturnValue(mockSendHook());
  usePatchStrategyMock.mockReturnValue(mockPatchHook());
});

// ---------------------------------------------------------------------------
// 1. Hook wiring -- StrategyPanel calls useMessages, useStrategy, useSendMessage
// ---------------------------------------------------------------------------

describe("hook wiring", () => {
  it("calls useMessages with the projectId", () => {
    render(<StrategyPanel projectId="proj-1" />);
    expect(useMessagesMock).toHaveBeenCalledWith("proj-1");
  });

  it("calls useStrategy with the projectId", () => {
    render(<StrategyPanel projectId="proj-1" />);
    expect(useStrategyMock).toHaveBeenCalledWith("proj-1");
  });

  it("calls useSendMessage (no-arg hook)", () => {
    render(<StrategyPanel projectId="proj-1" />);
    expect(useSendMessageMock).toHaveBeenCalled();
  });

  it("renders the header label in Bahasa Indonesia", () => {
    render(<StrategyPanel projectId="proj-1" />);
    const labels = screen.getAllByText(COPY.assistantName);
    expect(labels.length).toBeGreaterThanOrEqual(1);
  });
});

// ---------------------------------------------------------------------------
// 2. Starter state -- empty messages shows suggestions and can send
// ---------------------------------------------------------------------------

describe("starter state (empty messages)", () => {
  beforeEach(() => {
    useMessagesMock.mockReturnValue({
      data: [],
      isLoading: false,
    });
    useStrategyMock.mockReturnValue(
      mockStrategyData({
        data: {
          state: {
            ...mockStrategyData().data!.state,
            missing_fields: [],
          },
          readiness_score: 0,
        },
      }),
    );
  });

  it("shows Indonesian EmptyState when there are no messages", () => {
    render(<StrategyPanel projectId="proj-1" />);
    expect(screen.getByText(COPY.emptyTitle)).toBeInTheDocument();
  });

  it("shows suggestion chips when empty", () => {
    render(<StrategyPanel projectId="proj-1" />);
    // At least one suggestion should be visible
    const suggestions = screen.getAllByRole("button", {
      name: /bantu saya|apa janji|sarankan pilar|sudut unik|titik masalah/i,
    });
    expect(suggestions.length).toBeGreaterThan(0);
  });

  it("clicking a suggestion chip calls send.mutateAsync with the suggestion text", async () => {
    const user = userEvent.setup();
    render(<StrategyPanel projectId="proj-1" />);

    const chip = screen.getByText(/bantu saya menentukan masalah utama ebook/i);
    await user.click(chip);

    expect(sendMutateAsyncMock).toHaveBeenCalledWith({
      project_id: "proj-1",
      content: COPY.defaultSuggestions[0],
    });
  });

  it("typing in textarea and clicking send calls send.mutateAsync", async () => {
    const user = userEvent.setup();
    render(<StrategyPanel projectId="proj-1" />);

    const textarea = screen.getByLabelText(COPY.composerPlaceholder);
    await user.type(textarea, "My custom message");

    const sendBtn = screen.getByLabelText(COPY.sendAriaLabel);
    await user.click(sendBtn);

    expect(sendMutateAsyncMock).toHaveBeenCalledWith({
      project_id: "proj-1",
      content: "My custom message",
    });
  });

  it("disables send button when textarea is empty", () => {
    render(<StrategyPanel projectId="proj-1" />);
    const sendBtn = screen.getByLabelText(COPY.sendAriaLabel);
    expect(sendBtn).toBeDisabled();
  });

  it("send button is enabled when textarea has content", async () => {
    const user = userEvent.setup();
    render(<StrategyPanel projectId="proj-1" />);

    const textarea = screen.getByLabelText(COPY.composerPlaceholder);
    await user.type(textarea, "Hello");

    const sendBtn = screen.getByLabelText(COPY.sendAriaLabel);
    expect(sendBtn).not.toBeDisabled();
  });

  it("clears textarea after sending", async () => {
    const user = userEvent.setup();
    render(<StrategyPanel projectId="proj-1" />);

    const textarea = screen.getByLabelText(COPY.composerPlaceholder);
    await user.type(textarea, "Hello");
    const sendBtn = screen.getByLabelText(COPY.sendAriaLabel);
    await user.click(sendBtn);

    await waitFor(() => {
      expect(textarea).toHaveValue("");
    });
  });

  it("Enter sends message (no modifier key needed)", async () => {
    const user = userEvent.setup();
    render(<StrategyPanel projectId="proj-1" />);

    const textarea = screen.getByLabelText(COPY.composerPlaceholder);
    await user.type(textarea, "Shortcut message");
    await user.keyboard("{Enter}");

    expect(sendMutateAsyncMock).toHaveBeenCalledWith({
      project_id: "proj-1",
      content: "Shortcut message",
    });
  });

  it("does NOT send message when Enter is pressed during IME composition (isComposing=true)", async () => {
    render(<StrategyPanel projectId="proj-1" />);

    const textarea = screen.getByLabelText(COPY.composerPlaceholder) as HTMLTextAreaElement;
    // Pre-fill the textarea so there is content to preserve
    (textarea as HTMLTextAreaElement).value = "Composing partial text";
    textarea.dispatchEvent(new Event("change", { bubbles: true }));

    // Fire keyDown with isComposing: true -- should NOT trigger send
    fireEvent.keyDown(textarea, {
      key: "Enter",
      shiftKey: false,
      isComposing: true,
    });

    // Send should NOT have been called
    expect(sendMutateAsyncMock).not.toHaveBeenCalled();
    // Textarea content should be preserved (not cleared)
    expect(textarea).toHaveValue("Composing partial text");
  });

  it("shows Indonesian pushToast on send failure", async () => {
    sendMutateAsyncMock.mockRejectedValueOnce(new Error("Network error"));
    const user = userEvent.setup();
    render(<StrategyPanel projectId="proj-1" />);

    const textarea = screen.getByLabelText(COPY.composerPlaceholder);
    await user.type(textarea, "Fail me");
    const sendBtn = screen.getByLabelText(COPY.sendAriaLabel);
    await user.click(sendBtn);

    await waitFor(() => {
      expect(pushToastMock).toHaveBeenCalledWith({
        title: COPY.sendError,
        variant: "danger",
      });
    });
  });
});

// ---------------------------------------------------------------------------
// 3. Brief editor can be opened
// ---------------------------------------------------------------------------

describe("brief editor", () => {
  beforeEach(() => {
    useMessagesMock.mockReturnValue(mockMessagesData());
    useStrategyMock.mockReturnValue(mockStrategyData());
  });

  it("shows missing-field CTA with Indonesian 'edit langsung' link when messages exist and fields are missing", () => {
    render(<StrategyPanel projectId="proj-1" />);
    const editLink = screen.getByText("edit langsung");
    expect(editLink).toBeInTheDocument();
    expect(editLink.tagName).toBe("BUTTON");
  });

  it("opens StrategyFieldEditor modal when 'edit langsung' is clicked", async () => {
    const user = userEvent.setup();
    render(<StrategyPanel projectId="proj-1" />);

    const editLink = screen.getByText("edit langsung");
    await user.click(editLink);

    await waitFor(() => {
      expect(screen.getByRole("dialog")).toBeInTheDocument();
    });
  });

  it("StrategyFieldEditor modal shows Indonesian title", async () => {
    const user = userEvent.setup();
    render(<StrategyPanel projectId="proj-1" />);

    await user.click(screen.getByText("edit langsung"));

    await waitFor(() => {
      expect(screen.getByText(COPY.editorTitle)).toBeInTheDocument();
    });
  });

  it("'Edit brief' button on StrategyBriefCard opens the editor", async () => {
    const user = userEvent.setup();
    render(<StrategyPanel projectId="proj-1" />);

    // There are two "Edit brief" buttons (desktop + mobile).
    const editButtons = screen.getAllByLabelText(COPY.editBrief);
    expect(editButtons.length).toBe(2); // baseline: desktop + mobile duplicates
    await user.click(editButtons[0]!);

    await waitFor(() => {
      expect(screen.getByRole("dialog")).toBeInTheDocument();
    });
  });

  it("closing the editor removes the modal", async () => {
    const user = userEvent.setup();
    render(<StrategyPanel projectId="proj-1" />);

    // Open editor
    await user.click(screen.getByText("edit langsung"));
    await waitFor(() => {
      expect(screen.getByRole("dialog")).toBeInTheDocument();
    });

    // Close via Cancel (Batal) button in footer
    const dialog = screen.getByRole("dialog");
    const cancelBtn = within(dialog).getByText(COPY.editorCancel);
    await user.click(cancelBtn);

    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });
  });

  it("does not show the editor when editorOpen is false initially", () => {
    render(<StrategyPanel projectId="proj-1" />);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// 4. onRequestOutline prop acceptance
// ---------------------------------------------------------------------------

describe("onRequestOutline prop", () => {
  it("renders without error when onRequestOutline is provided", () => {
    const onRequestOutline = vi.fn();
    expect(() => {
      render(
        <StrategyPanel projectId="proj-1" onRequestOutline={onRequestOutline} />,
      );
    }).not.toThrow();
  });

  it("accepts onRequestOutline as an optional prop (renders same as without)", () => {
    const onRequestOutline = vi.fn();
    render(
      <StrategyPanel projectId="proj-1" onRequestOutline={onRequestOutline} />,
    );
    const labels = screen.getAllByText(COPY.assistantName);
    expect(labels.length).toBeGreaterThanOrEqual(1);
  });

  it("renders without onRequestOutline (prop is optional)", () => {
    expect(() => {
      render(<StrategyPanel projectId="proj-1" />);
    }).not.toThrow();
  });

  it("StrategyReadinessCard shows Indonesian next action label", () => {
    const onRequestOutline = vi.fn();
    render(
      <StrategyPanel projectId="proj-1" onRequestOutline={onRequestOutline} />,
    );

    // The readiness card renders with Indonesian next action label (desktop + mobile)
    const labels = screen.getAllByText(COPY.nextActionContinue);
    expect(labels.length).toBeGreaterThanOrEqual(1);
    // onRequestOutline was NOT called during render (it's not wired yet)
    expect(onRequestOutline).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// 5. Messages rendering
// ---------------------------------------------------------------------------

describe("messages rendering", () => {
  beforeEach(() => {
    useMessagesMock.mockReturnValue(mockMessagesData());
  });

  it("renders existing messages", () => {
    render(<StrategyPanel projectId="proj-1" />);
    expect(
      screen.getByText("Hello, help me define my ebook strategy"),
    ).toBeInTheDocument();
  });

  it("renders Indonesian assistant label in header", () => {
    render(<StrategyPanel projectId="proj-1" />);
    const labels = screen.getAllByText(COPY.assistantName);
    // Header label only (STRATEGY ASSISTANT footer removed per S09)
    expect(labels.length).toBeGreaterThanOrEqual(1);
  });
});

// ---------------------------------------------------------------------------
// 6. Loading states
// ---------------------------------------------------------------------------

describe("loading states", () => {
  it("shows skeleton placeholders when messages are loading", () => {
    useMessagesMock.mockReturnValue({
      data: undefined,
      isLoading: true,
    });
    render(<StrategyPanel projectId="proj-1" />);
    const skeletons = document.querySelectorAll(".skeleton");
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it("shows skeleton placeholders when strategy is loading", () => {
    useMessagesMock.mockReturnValue(mockMessagesData());
    useStrategyMock.mockReturnValue({
      data: undefined,
      isLoading: true,
    });
    render(<StrategyPanel projectId="proj-1" />);
    const skeletons = document.querySelectorAll(".skeleton");
    expect(skeletons.length).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// 7. Missing-field prompt suggestions
// ---------------------------------------------------------------------------

describe("missing-field prompts", () => {
  it("shows Indonesian context-aware suggestion chips derived from missing fields", () => {
    useMessagesMock.mockReturnValue(mockMessagesData());
    useStrategyMock.mockReturnValue(
      mockStrategyData({
        data: {
          state: {
            ...mockStrategyData().data!.state,
            missing_fields: ["primary_problem", "desired_outcome"],
          },
          readiness_score: 50,
        },
      }),
    );

    render(<StrategyPanel projectId="proj-1" />);

    // Should show Indonesian suggestions based on missing fields
    expect(
      screen.getByText(COPY.missingFieldPrompts.primary_problem),
    ).toBeInTheDocument();
    expect(
      screen.getByText(COPY.missingFieldPrompts.desired_outcome),
    ).toBeInTheDocument();
  });

  it("falls back to default Indonesian suggestions when no missing fields", () => {
    useMessagesMock.mockReturnValue(mockMessagesData());
    useStrategyMock.mockReturnValue(
      mockStrategyData({
        data: {
          state: {
            ...mockStrategyData().data!.state,
            missing_fields: [],
          },
          readiness_score: 50,
        },
      }),
    );

    render(<StrategyPanel projectId="proj-1" />);

    // Should show default Indonesian suggestions
    expect(
      screen.getByText(COPY.defaultSuggestions[0]),
    ).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// 8. Composer -- aria-live send status
// ---------------------------------------------------------------------------

describe("composer accessibility", () => {
  it("announces Indonesian sending status via aria-live region", () => {
    useSendMessageMock.mockReturnValue({
      mutateAsync: sendMutateAsyncMock,
      isPending: true,
    });
    render(<StrategyPanel projectId="proj-1" />);
    expect(screen.getByText(COPY.sending)).toBeInTheDocument();
  });

  it("does not announce when not sending", () => {
    useSendMessageMock.mockReturnValue(mockSendHook({ isPending: false }));
    render(<StrategyPanel projectId="proj-1" />);
    const srRegion = document.querySelector('[aria-live="polite"]');
    expect(srRegion?.textContent).not.toContain("Mengirim pesan");
  });
});

// ---------------------------------------------------------------------------
// 9. Indonesian copy -- BriefCard progress
// ---------------------------------------------------------------------------

describe("Indonesian copy: BriefCard progress", () => {
  it("displays 'X dari 6 informasi inti lengkap'", () => {
    // Uses default mock data: topic + audience filled (2 of 6 core filled)
    render(<StrategyPanel projectId="proj-1" />);
    expect(screen.getAllByText("2 dari 6 informasi inti lengkap").length).toBeGreaterThanOrEqual(1);
  });
});

// ---------------------------------------------------------------------------
// 10. Indonesian copy -- ReadinessCard title
// ---------------------------------------------------------------------------

describe("Indonesian copy: ReadinessCard title", () => {
  it("displays 'Kesiapan Strategi' as the card title", () => {
    render(<StrategyPanel projectId="proj-1" />);
    expect(screen.getAllByText("Kesiapan Strategi").length).toBeGreaterThanOrEqual(1);
  });
});

// ---------------------------------------------------------------------------
// 11. Indonesian copy -- FieldEditor title and save button
// ---------------------------------------------------------------------------

describe("Indonesian copy: FieldEditor title and buttons", () => {
  it("displays Indonesian editor title and buttons", async () => {
    const user = userEvent.setup();
    render(<StrategyPanel projectId="proj-1" />);

    // Open editor via "Edit brief" button
    const editButtons = screen.getAllByLabelText(COPY.editBrief);
    await user.click(editButtons[0]!);

    await waitFor(() => {
      expect(screen.getByRole("dialog")).toBeInTheDocument();
    });

    expect(screen.getByText(COPY.editorTitle)).toBeInTheDocument();
    expect(screen.getByText("Simpan")).toBeInTheDocument();
    expect(screen.getByText("Batal")).toBeInTheDocument();
  });
});
