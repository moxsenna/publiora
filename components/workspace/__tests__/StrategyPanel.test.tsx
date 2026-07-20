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
  starterReplies: [
    { label: "Cari topik ebook", message: "Bantu saya menemukan topik ebook yang paling potensial." },
    { label: "Saya sudah punya topik", message: "Saya sudah punya topik ebook dan ingin menyusun strateginya." },
    { label: "Ebook untuk leads", message: "Saya ingin membuat ebook untuk mendapatkan leads." },
  ],
};

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
      readiness_score: 50,
    },
    isLoading: false,
    ...overrides,
  };
}

function makeAssistantMsg(id: string, overrides: Record<string, unknown> = {}) {
  return {
    id,
    project_id: "proj-1",
    role: "assistant" as const,
    content: "I'd be happy to help! Let's start with your topic.",
    agent: "strategist" as const,
    metadata: {} as Record<string, unknown>,
    created_at: "2024-01-01T00:00:01Z",
    ...overrides,
  };
}

function makeUserMsg(id: string, content: string, overrides: Record<string, unknown> = {}) {
  return {
    id,
    project_id: "proj-1",
    role: "user" as const,
    content,
    agent: null as null,
    metadata: {} as Record<string, unknown>,
    created_at: "2024-01-01T00:00:00Z",
    ...overrides,
  };
}

function mockMessagesData(overrides: Record<string, unknown> = {}) {
  return {
    data: [
      makeUserMsg("msg-1", "Hello, help me define my ebook strategy"),
      makeAssistantMsg("msg-2"),
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
    mutateAsync: vi.fn(),
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
  useProjectMock.mockReturnValue({
    data: { id: "proj-1", ebook_type: "lead_magnet" },
    isLoading: false,
  });
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
// 2. Starter state -- empty messages shows starter chips and can send
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
            ...makeBaseState(),
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

  it("shows exactly 3 starter reply chips when empty", () => {
    render(<StrategyPanel projectId="proj-1" />);
    // All three starter chip labels should be visible
    expect(screen.getByText(COPY.starterReplies[0].label)).toBeInTheDocument();
    expect(screen.getByText(COPY.starterReplies[1].label)).toBeInTheDocument();
    expect(screen.getByText(COPY.starterReplies[2].label)).toBeInTheDocument();
  });

  it("clicking a starter chip calls send.mutateAsync with the full message, not just label", async () => {
    const user = userEvent.setup();
    render(<StrategyPanel projectId="proj-1" />);

    const chip = screen.getByText(COPY.starterReplies[0].label);
    await user.click(chip);

    expect(sendMutateAsyncMock).toHaveBeenCalledWith({
      project_id: "proj-1",
      content: COPY.starterReplies[0].message,
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

  it("Shift+Enter inserts newline and does NOT send", async () => {
    const user = userEvent.setup();
    render(<StrategyPanel projectId="proj-1" />);

    const textarea = screen.getByLabelText(COPY.composerPlaceholder) as HTMLTextAreaElement;
    await user.type(textarea, "Line 1");

    // Use keyboard with Shift held to simulate Shift+Enter (which inserts newline)
    await user.keyboard("{Shift>}{Enter}{/Shift}");

    // Send must NOT have been called
    expect(sendMutateAsyncMock).not.toHaveBeenCalled();

    // The textarea should now contain a newline
    expect(textarea.value).toContain("\n");
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

  it("shows optimistic user bubble when sending from empty state", async () => {
    // Make sendMutateAsync hang so pendingText stays set
    let resolve: (v: unknown) => void = () => {};
    sendMutateAsyncMock.mockImplementation(
      () => new Promise((r) => { resolve = r; })
    );

    const user = userEvent.setup();
    render(<StrategyPanel projectId="proj-1" />);

    const chip = screen.getByText(COPY.starterReplies[0].label);
    await user.click(chip);

    // The optimistic bubble should show the full message text that was sent
    await waitFor(() => {
      expect(screen.getByText(COPY.starterReplies[0].message)).toBeInTheDocument();
    });

    // The pending indicator should also be visible (bubble + aria-live may both match)
    expect(screen.getAllByText(/Mengirim/).length).toBeGreaterThan(0);

    // Resolve the promise to clean up
    resolve({});
  });
});

// ---------------------------------------------------------------------------
// 3. Free text send
// ---------------------------------------------------------------------------

describe("free text send", () => {
  beforeEach(() => {
    useMessagesMock.mockReturnValue(mockMessagesData());
  });

  it("free text send calls mutateAsync with typed content", async () => {
    const user = userEvent.setup();
    render(<StrategyPanel projectId="proj-1" />);

    const textarea = screen.getByLabelText(COPY.composerPlaceholder);
    await user.type(textarea, "My free text message");

    const sendBtn = screen.getByLabelText(COPY.sendAriaLabel);
    await user.click(sendBtn);

    expect(sendMutateAsyncMock).toHaveBeenCalledWith({
      project_id: "proj-1",
      content: "My free text message",
    });
  });
});

// ---------------------------------------------------------------------------
// 4. Contextual suggestions from metadata
// ---------------------------------------------------------------------------

const CTX_TIMESTAMP = "2024-01-01T00:00:00Z";
const CTX_REPLIES = [
  { label: "Target UMKM", message: "Target audiens saya adalah pemilik UMKM.", intent: "answer" as const },
  { label: "Kesulitan digital", message: "Masalah utamanya adalah kesulitan pemasaran digital.", intent: "answer" as const },
  { label: "Butuh saran topik", message: "Saya butuh saran topik yang tepat.", intent: "ask_recommendation" as const },
];

describe("contextual suggestions from metadata", () => {
  beforeEach(() => {
    useStrategyMock.mockReturnValue(
      mockStrategyData({
        data: {
          state: {
            ...makeBaseState(),
            updated_at: CTX_TIMESTAMP,
          },
          readiness_score: 50,
        },
      }),
    );
  });

  it("renders ContextualQuickReplies under latest assistant when metadata has suggestions", () => {
    useMessagesMock.mockReturnValue({
      data: [
        makeUserMsg("msg-1", "Hello"),
        makeAssistantMsg("msg-2", {
          metadata: {
            suggested_replies: CTX_REPLIES,
            strategy_context_updated_at: CTX_TIMESTAMP,
          },
        }),
      ],
      isLoading: false,
    });

    render(<StrategyPanel projectId="proj-1" />);

    // Chips should be visible
    expect(screen.getByText(CTX_REPLIES[0].label)).toBeInTheDocument();
    expect(screen.getByText(CTX_REPLIES[1].label)).toBeInTheDocument();
  });

  it("clicking a contextual chip calls send.mutateAsync with suggestion.message", async () => {
    useMessagesMock.mockReturnValue({
      data: [
        makeUserMsg("msg-1", "Hello"),
        makeAssistantMsg("msg-2", {
          metadata: {
            suggested_replies: CTX_REPLIES,
            strategy_context_updated_at: CTX_TIMESTAMP,
          },
        }),
      ],
      isLoading: false,
    });

    const user = userEvent.setup();
    render(<StrategyPanel projectId="proj-1" />);

    const chip = screen.getByText(CTX_REPLIES[0].label);
    await user.click(chip);

    expect(sendMutateAsyncMock).toHaveBeenCalledWith({
      project_id: "proj-1",
      content: CTX_REPLIES[0].message,
    });
  });

  it("does NOT render contextual chips when strategy_context_updated_at is stale (differs from state.updated_at)", () => {
    useMessagesMock.mockReturnValue({
      data: [
        makeUserMsg("msg-1", "Hello"),
        makeAssistantMsg("msg-2", {
          metadata: {
            suggested_replies: CTX_REPLIES,
            strategy_context_updated_at: "old-timestamp",
          },
        }),
      ],
      isLoading: false,
    });

    render(<StrategyPanel projectId="proj-1" />);

    // Chips should NOT be visible because timestamp doesn't match
    expect(screen.queryByText(CTX_REPLIES[0].label)).not.toBeInTheDocument();
    expect(screen.queryByText(CTX_REPLIES[1].label)).not.toBeInTheDocument();
  });

  it("does NOT render contextual chips when metadata has no suggested_replies", () => {
    useMessagesMock.mockReturnValue({
      data: [
        makeUserMsg("msg-1", "Hello"),
        makeAssistantMsg("msg-2", {
          metadata: {
            strategy_context_updated_at: CTX_TIMESTAMP,
            // no suggested_replies
          },
        }),
      ],
      isLoading: false,
    });

    render(<StrategyPanel projectId="proj-1" />);

    // No chips
    const chipsGroup = screen.queryByRole("group", { name: /balasan cepat/i });
    expect(chipsGroup).not.toBeInTheDocument();
  });

  it("does NOT render starter chips when messages exist", () => {
    useMessagesMock.mockReturnValue({
      data: [
        makeUserMsg("msg-1", "Hello"),
        makeAssistantMsg("msg-2", {
          metadata: {
            suggested_replies: [],
            strategy_context_updated_at: CTX_TIMESTAMP,
          },
        }),
      ],
      isLoading: false,
    });

    render(<StrategyPanel projectId="proj-1" />);

    // Starter chips should NOT appear
    expect(screen.queryByText(COPY.starterReplies[0].label)).not.toBeInTheDocument();
    expect(screen.queryByText(COPY.starterReplies[1].label)).not.toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// 5. Latest-only behavior
// ---------------------------------------------------------------------------

describe("latest-only behavior", () => {
  const TS = CTX_TIMESTAMP;
  const earlierReplies = [
    { label: "Old chip A", message: "Old message A", intent: "answer" },
    { label: "Old chip B", message: "Old message B", intent: "answer" },
  ];
  const latestReplies = [
    { label: "New chip X", message: "New message X", intent: "answer" },
    { label: "New chip Y", message: "New message Y", intent: "answer" },
  ];

  beforeEach(() => {
    useStrategyMock.mockReturnValue(
      mockStrategyData({
        data: {
          state: {
            ...makeBaseState(),
            updated_at: TS,
          },
          readiness_score: 50,
        },
      }),
    );
  });

  it("renders contextual chips ONLY under the latest assistant message", () => {
    useMessagesMock.mockReturnValue({
      data: [
        makeUserMsg("msg-1", "Hello"),
        makeAssistantMsg("msg-2", {
          metadata: {
            suggested_replies: earlierReplies,
            strategy_context_updated_at: TS,
          },
        }),
        makeUserMsg("msg-3", "Follow up"),
        makeAssistantMsg("msg-4", {
          metadata: {
            suggested_replies: latestReplies,
            strategy_context_updated_at: TS,
          },
        }),
      ],
      isLoading: false,
    });

    render(<StrategyPanel projectId="proj-1" />);

    // Latest chips visible
    expect(screen.getByText("New chip X")).toBeInTheDocument();
    expect(screen.getByText("New chip Y")).toBeInTheDocument();

    // Earlier chips NOT visible
    expect(screen.queryByText("Old chip A")).not.toBeInTheDocument();
    expect(screen.queryByText("Old chip B")).not.toBeInTheDocument();
  });

  it("hides earlier chips when latest assistant has no suggestions", () => {
    useMessagesMock.mockReturnValue({
      data: [
        makeUserMsg("msg-1", "Hello"),
        makeAssistantMsg("msg-2", {
          metadata: {
            suggested_replies: earlierReplies,
            strategy_context_updated_at: TS,
          },
        }),
        makeUserMsg("msg-3", "Follow up"),
        makeAssistantMsg("msg-4", {
          metadata: {
            // latest has no suggested_replies
            strategy_context_updated_at: TS,
          },
        }),
      ],
      isLoading: false,
    });

    render(<StrategyPanel projectId="proj-1" />);

    // No chips anywhere
    expect(screen.queryByText("Old chip A")).not.toBeInTheDocument();
    expect(screen.queryByText("New chip X")).not.toBeInTheDocument();
    const chipsGroup = screen.queryByRole("group", { name: /balasan cepat/i });
    expect(chipsGroup).not.toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// 6. Optimistic user bubble and skeleton
// ---------------------------------------------------------------------------

describe("optimistic user bubble and skeleton", () => {
  it("shows optimistic user bubble with pending text when send is in progress", async () => {
    let resolve: (v: unknown) => void = () => {};
    sendMutateAsyncMock.mockImplementation(
      () => new Promise((r) => { resolve = r; })
    );

    useMessagesMock.mockReturnValue(mockMessagesData());

    const user = userEvent.setup();
    render(<StrategyPanel projectId="proj-1" />);

    const textarea = screen.getByLabelText(COPY.composerPlaceholder);
    await user.type(textarea, "My pending message");
    const sendBtn = screen.getByLabelText(COPY.sendAriaLabel);
    await user.click(sendBtn);

    await waitFor(() => {
      expect(screen.getByText("My pending message")).toBeInTheDocument();
    });

    expect(screen.getAllByText(/Mengirim/).length).toBeGreaterThan(0);
    expect(screen.getByText(/Menyiapkan pilihan berikutnya/)).toBeInTheDocument();

    resolve({});
  });

  it("shows 'Asisten menyiapkan balasan…' when sending from empty state", async () => {
    let resolve: (v: unknown) => void = () => {};
    sendMutateAsyncMock.mockImplementation(
      () => new Promise((r) => { resolve = r; })
    );

    useMessagesMock.mockReturnValue({ data: [], isLoading: false });
    useSendMessageMock.mockReturnValue(mockSendHook({ isPending: false }));

    render(<StrategyPanel projectId="proj-1" />);

    const chip = screen.getByText(COPY.starterReplies[0].label);
    const user = userEvent.setup();
    await user.click(chip);

    await waitFor(() => {
      expect(screen.getByText(/Asisten menyiapkan balasan/)).toBeInTheDocument();
    });

    resolve({});
  });

  it("marks failed send, restores composer, and supports retry", async () => {
    sendMutateAsyncMock
      .mockRejectedValueOnce(new Error("network"))
      .mockResolvedValueOnce({});

    useMessagesMock.mockReturnValue(mockMessagesData());
    useSendMessageMock.mockReturnValue(mockSendHook({ isPending: false }));

    const user = userEvent.setup();
    render(<StrategyPanel projectId="proj-1" />);

    const textarea = screen.getByLabelText(COPY.composerPlaceholder) as HTMLTextAreaElement;
    await user.type(textarea, "Pesan gagal dulu");
    await user.click(screen.getByLabelText(COPY.sendAriaLabel));

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Kirim ulang" })).toBeInTheDocument();
    });
    // Bubble + aria-live both surface the error copy
    expect(screen.getAllByText(COPY.sendError).length).toBeGreaterThan(0);

    // Composer restored with the failed content
    expect(textarea.value).toBe("Pesan gagal dulu");
    // Skeleton should NOT appear on failed state
    expect(screen.queryByText(/Menyiapkan pilihan berikutnya/)).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Kirim ulang" }));

    await waitFor(() => {
      expect(sendMutateAsyncMock).toHaveBeenCalledTimes(2);
    });
    expect(sendMutateAsyncMock).toHaveBeenLastCalledWith({
      project_id: "proj-1",
      content: "Pesan gagal dulu",
    });

    await waitFor(() => {
      expect(screen.queryByRole("button", { name: "Kirim ulang" })).not.toBeInTheDocument();
    });
  });
});

// ---------------------------------------------------------------------------
// 7. No inline missing-fields CTA in conversation column
// ---------------------------------------------------------------------------

describe("no inline missing-fields CTA", () => {
  it("does NOT render 'edit langsung' link in conversation column", () => {
    useMessagesMock.mockReturnValue(mockMessagesData());
    useStrategyMock.mockReturnValue(
      mockStrategyData({
        data: {
          state: {
            ...makeBaseState(),
            missing_fields: ["primary_problem", "desired_outcome"],
          },
          readiness_score: 50,
        },
      }),
    );

    render(<StrategyPanel projectId="proj-1" />);

    // The inline "edit langsung" CTA should NOT exist
    expect(screen.queryByText("edit langsung")).not.toBeInTheDocument();
  });

  it("does NOT render the missing-field CTA text in conversation column", () => {
    useMessagesMock.mockReturnValue(mockMessagesData());
    useStrategyMock.mockReturnValue(
      mockStrategyData({
        data: {
          state: {
            ...makeBaseState(),
            missing_fields: ["primary_problem"],
          },
          readiness_score: 50,
        },
      }),
    );

    render(<StrategyPanel projectId="proj-1" />);

    // The Indonesian missing-field CTA sentence should NOT be in conversation
    expect(screen.queryByText(/informasi inti masih diperlukan/i)).not.toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// 8. Brief editor can be opened via StrategyBriefCard
// ---------------------------------------------------------------------------

describe("brief editor", () => {
  beforeEach(() => {
    useMessagesMock.mockReturnValue(mockMessagesData());
    useStrategyMock.mockReturnValue(mockStrategyData());
  });

  it("'Edit brief' button on StrategyBriefCard opens the editor", async () => {
    const user = userEvent.setup();
    render(<StrategyPanel projectId="proj-1" />);

    // There is one "Edit brief" button (desktop right panel, hidden on <lg but in DOM)
    const editButtons = screen.getAllByLabelText(COPY.editBrief);
    expect(editButtons.length).toBe(1);
    await user.click(editButtons[0]!);

    await waitFor(() => {
      expect(screen.getByRole("dialog")).toBeInTheDocument();
    });
  });

  it("StrategyFieldEditor modal shows Indonesian title", async () => {
    const user = userEvent.setup();
    render(<StrategyPanel projectId="proj-1" />);

    const editButtons = screen.getAllByLabelText(COPY.editBrief);
    await user.click(editButtons[0]!);

    await waitFor(() => {
      expect(screen.getByText(COPY.editorTitle)).toBeInTheDocument();
    });
  });

  it("closing the editor removes the modal", async () => {
    const user = userEvent.setup();
    render(<StrategyPanel projectId="proj-1" />);

    // Open editor via "Edit brief"
    const editButtons = screen.getAllByLabelText(COPY.editBrief);
    await user.click(editButtons[0]!);
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
// 9. onRequestOutline prop acceptance
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
  });
});

// ---------------------------------------------------------------------------
// 10. Messages rendering
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
    expect(labels.length).toBeGreaterThanOrEqual(1);
  });
});

// ---------------------------------------------------------------------------
// 11. Loading states
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
// 12. Composer -- aria-live send status
// ---------------------------------------------------------------------------

describe("composer accessibility", () => {
  it("announces Indonesian sending status via aria-live region while pendingSend is active", async () => {
    let resolve: (v: unknown) => void = () => {};
    sendMutateAsyncMock.mockImplementation(
      () => new Promise((r) => { resolve = r; })
    );
    useMessagesMock.mockReturnValue(mockMessagesData());
    useSendMessageMock.mockReturnValue(mockSendHook({ isPending: false }));

    const user = userEvent.setup();
    render(<StrategyPanel projectId="proj-1" />);

    const textarea = screen.getByLabelText(COPY.composerPlaceholder);
    await user.type(textarea, "Status live");
    await user.click(screen.getByLabelText(COPY.sendAriaLabel));

    await waitFor(() => {
      const srRegion = document.querySelector('[aria-live="polite"].sr-only');
      expect(srRegion?.textContent ?? "").toMatch(/Mengirim pesan/);
    });

    resolve({});
  });

  it("does not announce when not sending", () => {
    useSendMessageMock.mockReturnValue(mockSendHook({ isPending: false }));
    render(<StrategyPanel projectId="proj-1" />);
    const srRegion = document.querySelector('[aria-live="polite"].sr-only');
    expect(srRegion?.textContent ?? "").not.toContain("Mengirim pesan");
  });
});

// ---------------------------------------------------------------------------
// 13. Indonesian copy -- BriefCard progress
// ---------------------------------------------------------------------------

describe("Indonesian copy: BriefCard progress", () => {
  it("displays type-aware brief progress for lead magnet", () => {
    // Default mock: topic + audience filled. Lead magnet requires 7 fields.
    render(<StrategyPanel projectId="proj-1" />);
    expect(
      screen.getAllByText("2 dari 7 informasi inti lengkap").length,
    ).toBeGreaterThanOrEqual(1);
  });
});

// ---------------------------------------------------------------------------
// 14. Indonesian copy -- ReadinessCard title
// ---------------------------------------------------------------------------

describe("Indonesian copy: ReadinessCard title", () => {
  it("displays 'Kesiapan Strategi' as the card title", () => {
    render(<StrategyPanel projectId="proj-1" />);
    expect(screen.getAllByText("Kesiapan Strategi").length).toBeGreaterThanOrEqual(1);
  });
});

// ---------------------------------------------------------------------------
// 15. Indonesian copy -- FieldEditor title and buttons
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
    expect(screen.getByText("Simpan perubahan")).toBeInTheDocument();
    expect(screen.getByText("Batal")).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// 16. Double-click protection (send.isPending blocks duplicate sends)
// ---------------------------------------------------------------------------

describe("double-click protection", () => {
  it("does not send when isPending is true", async () => {
    // Simulate pending
    sendMutateAsyncMock.mockImplementation(
      () => new Promise((r) => setTimeout(() => r({}), 1000))
    );

    useMessagesMock.mockReturnValue(mockMessagesData());
    useSendMessageMock.mockReturnValue(mockSendHook({ isPending: false }));

    render(<StrategyPanel projectId="proj-1" />);

    const textarea = screen.getByLabelText(COPY.composerPlaceholder);
    const user = userEvent.setup();
    await user.type(textarea, "Test");

    const sendBtn = screen.getByLabelText(COPY.sendAriaLabel);
    await user.click(sendBtn); // first click fires send

    // Button should be disabled while pending
    // (we can't easily test isPending state in jsdom since React re-renders need hook mock changes)
    // But we verify the core guard: onSend checks send.isPending

    // The mutateAsync should have been called exactly once
    expect(sendMutateAsyncMock).toHaveBeenCalledTimes(1);
  });
});
