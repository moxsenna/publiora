// @vitest-environment jsdom

import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom/vitest";
import * as React from "react";

// ---------------------------------------------------------------------------
// jsdom polyfills
// ---------------------------------------------------------------------------

// jsdom does not implement scrollTo; stub it so the auto-scroll effect runs.
Element.prototype.scrollTo = vi.fn() as unknown as typeof Element.prototype.scrollTo;

// ---------------------------------------------------------------------------
// Mocks — hoisted by vitest before imports
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
// 1. Hook wiring — StrategyPanel calls useMessages, useStrategy, useSendMessage
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
    // useSendMessage is called as a zero-arg hook; vitest records the call
    expect(useSendMessageMock).toHaveBeenCalled();
  });

  it("renders the header label", () => {
    render(<StrategyPanel projectId="proj-1" />);
    // "Strategy Assistant" appears in the header AND in each assistant message bubble
    const labels = screen.getAllByText("Strategy Assistant");
    expect(labels.length).toBeGreaterThanOrEqual(1);
  });
});

// ---------------------------------------------------------------------------
// 2. Starter state — empty messages shows suggestions and can send
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

  it("shows EmptyState when there are no messages", () => {
    render(<StrategyPanel projectId="proj-1" />);
    expect(screen.getByText("Start a conversation")).toBeInTheDocument();
  });

  it("shows suggestion chips when empty", () => {
    render(<StrategyPanel projectId="proj-1" />);
    // At least one suggestion should be visible
    const suggestions = screen.getAllByRole("button", {
      name: /help me define|what should the core|suggest content pillars|what unique angle|help me define pain points/i,
    });
    expect(suggestions.length).toBeGreaterThan(0);
  });

  it("clicking a suggestion chip calls send.mutateAsync with the suggestion text", async () => {
    const user = userEvent.setup();
    render(<StrategyPanel projectId="proj-1" />);

    const chip = screen.getByText(/help me define the primary problem/i);
    await user.click(chip);

    expect(sendMutateAsyncMock).toHaveBeenCalledWith({
      project_id: "proj-1",
      content: "Help me define the primary problem for my ebook",
    });
  });

  it("typing in textarea and clicking send calls send.mutateAsync", async () => {
    const user = userEvent.setup();
    render(<StrategyPanel projectId="proj-1" />);

    const textarea = screen.getByLabelText("Type your message");
    await user.type(textarea, "My custom message");

    const sendBtn = screen.getByLabelText("Send message");
    await user.click(sendBtn);

    expect(sendMutateAsyncMock).toHaveBeenCalledWith({
      project_id: "proj-1",
      content: "My custom message",
    });
  });

  it("disables send button when textarea is empty", () => {
    render(<StrategyPanel projectId="proj-1" />);
    const sendBtn = screen.getByLabelText("Send message");
    expect(sendBtn).toBeDisabled();
  });

  it("send button is enabled when textarea has content", async () => {
    const user = userEvent.setup();
    render(<StrategyPanel projectId="proj-1" />);

    const textarea = screen.getByLabelText("Type your message");
    await user.type(textarea, "Hello");

    const sendBtn = screen.getByLabelText("Send message");
    expect(sendBtn).not.toBeDisabled();
  });

  it("clears textarea after sending", async () => {
    const user = userEvent.setup();
    render(<StrategyPanel projectId="proj-1" />);

    const textarea = screen.getByLabelText("Type your message");
    await user.type(textarea, "Hello");
    const sendBtn = screen.getByLabelText("Send message");
    await user.click(sendBtn);

    await waitFor(() => {
      expect(textarea).toHaveValue("");
    });
  });

  it("Ctrl+Enter sends message", async () => {
    const user = userEvent.setup();
    render(<StrategyPanel projectId="proj-1" />);

    const textarea = screen.getByLabelText("Type your message");
    await user.type(textarea, "Shortcut message");
    await user.keyboard("{Control>}{Enter}{/Control}");

    expect(sendMutateAsyncMock).toHaveBeenCalledWith({
      project_id: "proj-1",
      content: "Shortcut message",
    });
  });

  it("shows pushToast on send failure", async () => {
    sendMutateAsyncMock.mockRejectedValueOnce(new Error("Network error"));
    const user = userEvent.setup();
    render(<StrategyPanel projectId="proj-1" />);

    const textarea = screen.getByLabelText("Type your message");
    await user.type(textarea, "Fail me");
    const sendBtn = screen.getByLabelText("Send message");
    await user.click(sendBtn);

    await waitFor(() => {
      expect(pushToastMock).toHaveBeenCalledWith({
        title: "Message failed to send",
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
    // Ensure messages exist and missing fields are present
    useMessagesMock.mockReturnValue(mockMessagesData());
    useStrategyMock.mockReturnValue(mockStrategyData());
  });

  it("shows missing-field CTA with 'edit directly' link when messages exist and fields are missing", () => {
    render(<StrategyPanel projectId="proj-1" />);
    const editLink = screen.getByText("edit directly");
    expect(editLink).toBeInTheDocument();
    expect(editLink.tagName).toBe("BUTTON");
  });

  it("opens StrategyFieldEditor modal when 'edit directly' is clicked", async () => {
    const user = userEvent.setup();
    render(<StrategyPanel projectId="proj-1" />);

    const editLink = screen.getByText("edit directly");
    await user.click(editLink);

    await waitFor(() => {
      expect(screen.getByRole("dialog")).toBeInTheDocument();
    });
  });

  it("StrategyFieldEditor modal title is visible", async () => {
    const user = userEvent.setup();
    render(<StrategyPanel projectId="proj-1" />);

    await user.click(screen.getByText("edit directly"));

    await waitFor(() => {
      expect(screen.getByText("Edit Strategy Fields")).toBeInTheDocument();
    });
  });

  it("'Edit' button on StrategyBriefCard opens the editor", async () => {
    const user = userEvent.setup();
    render(<StrategyPanel projectId="proj-1" />);

    // There are two "Edit strategy fields" buttons (desktop + mobile).
    // Click the first one.
    const editButtons = screen.getAllByLabelText("Edit strategy fields");
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
    await user.click(screen.getByText("edit directly"));
    await waitFor(() => {
      expect(screen.getByRole("dialog")).toBeInTheDocument();
    });

    // Close via Cancel button in footer
    const dialog = screen.getByRole("dialog");
    const cancelBtn = within(dialog).getByText("Cancel");
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
    // Header should still be visible — component renders normally
    // "Strategy Assistant" appears in header + assistant message bubble
    const labels = screen.getAllByText("Strategy Assistant");
    expect(labels.length).toBeGreaterThanOrEqual(1);
  });

  it("renders without onRequestOutline (prop is optional)", () => {
    expect(() => {
      render(<StrategyPanel projectId="proj-1" />);
    }).not.toThrow();
  });

  it("StrategyReadinessCard currently does NOT wire onRequestOutline — it only displays next action text", () => {
    // This test documents the current gap: StrategyReadinessCard receives
    // readinessScore, missingFields, and nextAction, but NOT onRequestOutline.
    // The readiness gate CTA will be wired in a future task.
    const onRequestOutline = vi.fn();
    render(
      <StrategyPanel projectId="proj-1" onRequestOutline={onRequestOutline} />,
    );

    // The readiness card renders with the next action label (desktop + mobile)
    const labels = screen.getAllByText("Continue building strategy");
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

  it("renders assistant label on assistant messages", () => {
    render(<StrategyPanel projectId="proj-1" />);
    // Each assistant bubble shows the header label at the bottom
    const labels = screen.getAllByText("Strategy Assistant");
    // At least one from header + one from assistant message bubble
    expect(labels.length).toBeGreaterThan(1);
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
    // Skeleton component uses class "skeleton"
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
  it("shows context-aware suggestion chips derived from missing fields", () => {
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

    // Should show suggestions based on missing fields
    expect(
      screen.getByText("Help me identify the primary problem"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("What desired outcome should readers achieve?"),
    ).toBeInTheDocument();
  });

  it("falls back to default SUGGESTIONS when no missing fields", () => {
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

    // Should show default suggestions
    expect(
      screen.getByText("Help me define the primary problem for my ebook"),
    ).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// 8. Composer — aria-live send status
// ---------------------------------------------------------------------------

describe("composer accessibility", () => {
  it("announces sending status via aria-live region", () => {
    useSendMessageMock.mockReturnValue({
      mutateAsync: sendMutateAsyncMock,
      isPending: true,
    });
    render(<StrategyPanel projectId="proj-1" />);
    expect(screen.getByText("Sending message...")).toBeInTheDocument();
  });

  it("does not announce when not sending", () => {
    useSendMessageMock.mockReturnValue(mockSendHook({ isPending: false }));
    render(<StrategyPanel projectId="proj-1" />);
    // The sr-only div should not contain "Sending" text when not pending
    const srRegion = document.querySelector('[aria-live="polite"]');
    expect(srRegion?.textContent).not.toContain("Sending message...");
  });
});
