// @vitest-environment jsdom

import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom/vitest";
import * as React from "react";

import { ContextualQuickReplies } from "@/components/workspace/ContextualQuickReplies";
import type { StrategySuggestedReply } from "@/types/strategy";

// ---------------------------------------------------------------------------
// Helpers — factory for suggestions
// ---------------------------------------------------------------------------

function makeSuggestion(
  overrides: Partial<StrategySuggestedReply> = {},
): StrategySuggestedReply {
  return {
    label: "Label default",
    message: "Message default full",
    intent: "answer",
    ...overrides,
  };
}

function makeSuggestions(
  count: number,
  prefix = "S",
): StrategySuggestedReply[] {
  return Array.from({ length: count }, (_, i) =>
    makeSuggestion({
      label: `${prefix}${i + 1} label`,
      message: `${prefix}${i + 1} full message text`,
    }),
  );
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("ContextualQuickReplies", () => {
  // ----------------------------------------------------------------------
  // 1. Render 4 suggestions → 4 buttons visible
  // ----------------------------------------------------------------------
  it("renders 4 suggestion buttons when given 4 suggestions", () => {
    const suggestions = makeSuggestions(4);
    render(
      <ContextualQuickReplies
        suggestions={suggestions}
        disabled={false}
        onSelect={vi.fn()}
      />,
    );

    const buttons = screen.getAllByRole("button");
    expect(buttons).toHaveLength(4);
    expect(buttons[0]).toHaveTextContent("S1 label");
    expect(buttons[3]).toHaveTextContent("S4 label");
  });

  // ----------------------------------------------------------------------
  // 2. Click payload: sends full suggestion object, not just label
  // ----------------------------------------------------------------------
  it("fires onSelect with the full suggestion object on click", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    const suggestions = [
      makeSuggestion({
        label: "Jawab A",
        message: "Saya ingin menjawab dengan opsi A.",
        intent: "answer",
      }),
    ];

    render(
      <ContextualQuickReplies
        suggestions={suggestions}
        disabled={false}
        onSelect={onSelect}
      />,
    );

    await user.click(screen.getByText("Jawab A"));

    expect(onSelect).toHaveBeenCalledTimes(1);
    const calledWith = onSelect.mock.calls[0][0] as StrategySuggestedReply;
    expect(calledWith.label).toBe("Jawab A");
    expect(calledWith.message).toBe("Saya ingin menjawab dengan opsi A.");
    expect(calledWith.intent).toBe("answer");
  });

  // ----------------------------------------------------------------------
  // 3. Disabled state: buttons disabled, click does NOT fire onSelect
  // ----------------------------------------------------------------------
  it("disables all buttons and prevents click when disabled=true", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    const suggestions = makeSuggestions(2);

    render(
      <ContextualQuickReplies
        suggestions={suggestions}
        disabled={true}
        onSelect={onSelect}
      />,
    );

    const buttons = screen.getAllByRole("button");
    expect(buttons).toHaveLength(2);
    for (const btn of buttons) {
      expect(btn).toBeDisabled();
    }

    // Attempt click on first button — should not fire
    await user.click(buttons[0]);
    expect(onSelect).not.toHaveBeenCalled();
  });

  // ----------------------------------------------------------------------
  // 4a. Keyboard: focus button, press Enter → onSelect fires
  // ----------------------------------------------------------------------
  it("fires onSelect on Enter key when button is focused", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    const suggestions = [
      makeSuggestion({
        label: "Enter me",
        message: "Full enter message",
      }),
    ];

    render(
      <ContextualQuickReplies
        suggestions={suggestions}
        disabled={false}
        onSelect={onSelect}
      />,
    );

    const button = screen.getByText("Enter me");
    button.focus();
    expect(button).toHaveFocus();

    await user.keyboard("{Enter}");

    expect(onSelect).toHaveBeenCalledTimes(1);
    const calledWith = onSelect.mock.calls[0][0] as StrategySuggestedReply;
    expect(calledWith.label).toBe("Enter me");
    expect(calledWith.message).toBe("Full enter message");
  });

  // ----------------------------------------------------------------------
  // 4b. Keyboard: focus button, press Space → onSelect fires
  // ----------------------------------------------------------------------
  it("fires onSelect on Space key when button is focused", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    const suggestions = [
      makeSuggestion({
        label: "Space me",
        message: "Full space message",
      }),
    ];

    render(
      <ContextualQuickReplies
        suggestions={suggestions}
        disabled={false}
        onSelect={onSelect}
      />,
    );

    const button = screen.getByText("Space me");
    button.focus();
    expect(button).toHaveFocus();

    await user.keyboard(" ");

    expect(onSelect).toHaveBeenCalledTimes(1);
    const calledWith = onSelect.mock.calls[0][0] as StrategySuggestedReply;
    expect(calledWith.label).toBe("Space me");
    expect(calledWith.message).toBe("Full space message");
  });

  // ----------------------------------------------------------------------
  // 5. Max count protection: >4 suggestions → only first 4 rendered
  // ----------------------------------------------------------------------
  it("renders only the first 4 suggestions when more than 4 are provided", () => {
    const suggestions = makeSuggestions(6);
    render(
      <ContextualQuickReplies
        suggestions={suggestions}
        disabled={false}
        onSelect={vi.fn()}
      />,
    );

    const buttons = screen.getAllByRole("button");
    expect(buttons).toHaveLength(4);
    expect(buttons[0]).toHaveTextContent("S1 label");
    expect(buttons[3]).toHaveTextContent("S4 label");

    // S5 and S6 must NOT be in the DOM
    expect(screen.queryByText("S5 label")).toBeNull();
    expect(screen.queryByText("S6 label")).toBeNull();
  });

  // ----------------------------------------------------------------------
  // 6a. Title attribute: shown when label !== message
  // ----------------------------------------------------------------------
  it("sets title attribute to full message when label differs from message", () => {
    const suggestions = [
      makeSuggestion({
        label: "Short",
        message: "This is a much longer full message.",
      }),
    ];

    render(
      <ContextualQuickReplies
        suggestions={suggestions}
        disabled={false}
        onSelect={vi.fn()}
      />,
    );

    const button = screen.getByText("Short");
    expect(button).toHaveAttribute("title", "This is a much longer full message.");
  });

  // ----------------------------------------------------------------------
  // 6b. Title attribute: absent when label === message
  // ----------------------------------------------------------------------
  it("does NOT set a differing title when label equals message", () => {
    const suggestions = [
      makeSuggestion({
        label: "Same text",
        message: "Same text",
      }),
    ];

    render(
      <ContextualQuickReplies
        suggestions={suggestions}
        disabled={false}
        onSelect={vi.fn()}
      />,
    );

    const button = screen.getByText("Same text");
    // title may be undefined (not rendered) or equal to label — both fine
    const title = button.getAttribute("title");
    expect(title === null || title === "Same text").toBe(true);
  });

  // ----------------------------------------------------------------------
  // 6c. Label truncation: labels >48 chars are sliced
  // ----------------------------------------------------------------------
  it("truncates displayed label to 48 characters", () => {
    const longLabel = "A".repeat(60);
    const suggestions = [
      makeSuggestion({
        label: longLabel,
        message: "Some message",
      }),
    ];

    render(
      <ContextualQuickReplies
        suggestions={suggestions}
        disabled={false}
        onSelect={vi.fn()}
      />,
    );

    const button = screen.getByRole("button");
    expect(button).toHaveTextContent("A".repeat(48));
  });
});
