// @vitest-environment jsdom

import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import * as React from "react";
import { AssistantMessageContent } from "@/components/workspace/AssistantMessageContent";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function renderContent(content: string) {
  return render(<AssistantMessageContent content={content} />);
}

// ---------------------------------------------------------------------------
// Rendering tests
// ---------------------------------------------------------------------------

describe("AssistantMessageContent rendering", () => {
  // --- Bold ---
  it("renders bold text from **markdown**", () => {
    renderContent("Hello **Founder & Marketer** here");
    const strong = screen.getByText("Founder & Marketer");
    expect(strong.tagName).toBe("STRONG");
    expect(strong).toHaveClass("font-semibold");
  });

  // --- Emphasis ---
  it("renders italic/emphasis from *markdown*", () => {
    renderContent("This is *important* text");
    const em = screen.getByText("important");
    expect(em.tagName).toBe("EM");
  });

  // --- Unordered list ---
  it("renders unordered list from - prefixed lines", () => {
    renderContent("- First\n- Second\n- Third");
    const items = screen.getAllByRole("listitem");
    expect(items).toHaveLength(3);
    expect(items[0]).toHaveTextContent("First");
    expect(items[1]).toHaveTextContent("Second");
    expect(items[2]).toHaveTextContent("Third");

    // Verify parent is <ul>
    const list = screen.getByRole("list");
    expect(list.tagName).toBe("UL");
  });

  // --- Ordered list ---
  it("renders ordered list from numbered lines", () => {
    renderContent("1. Alpha\n2. Beta\n3. Gamma");
    const items = screen.getAllByRole("listitem");
    expect(items).toHaveLength(3);
    expect(items[0]).toHaveTextContent("Alpha");
    expect(items[1]).toHaveTextContent("Beta");
    expect(items[2]).toHaveTextContent("Gamma");

    // Verify parent is <ol>
    const list = screen.getByRole("list");
    expect(list.tagName).toBe("OL");
  });

  // --- Inline code ---
  it("renders inline code from backtick syntax", () => {
    renderContent("Use `react-markdown` for rendering");
    const code = screen.getByText("react-markdown");
    expect(code.tagName).toBe("CODE");
    expect(code).toHaveClass("bg-[var(--color-surface-2)]");
  });

  // --- Plain paragraph ---
  it("renders plain text inside a paragraph", () => {
    renderContent("Just a plain message");
    const p = screen.getByText("Just a plain message");
    expect(p.tagName).toBe("P");
  });
});

// ---------------------------------------------------------------------------
// Security tests
// ---------------------------------------------------------------------------

describe("AssistantMessageContent security", () => {
  // --- Raw HTML: script tags are escaped / not executed ---
  it("does not create <script> elements from raw HTML input", () => {
    renderContent('<script>alert("xss")</script>');
    // No <script> tag should exist in the DOM
    expect(document.querySelector("script")).toBeNull();
    // The text content should be escaped (not visible as raw tag either)
    // react-markdown with skipHtml strips raw HTML entirely
    expect(screen.queryByText(/alert/)).not.toBeInTheDocument();
  });

  // --- Raw HTML: arbitrary elements are escaped ---
  it("escapes unknown HTML tags (<foo>)", () => {
    renderContent("<foo>bar</foo>");
    // No <foo> element in DOM
    expect(document.querySelector("foo")).toBeNull();
    // The text "bar" should be visible (react-markdown escapes tags by default)
    expect(screen.getByText(/bar/)).toBeInTheDocument();
  });

  // --- Image markdown is disallowed ---
  it("does not render <img> from markdown image syntax", () => {
    renderContent("![alt text](http://evil.com/malware.png)");
    // No <img> in DOM
    expect(document.querySelector("img")).toBeNull();
    // With unwrapDisallowed, the alt text "alt text" may appear as plain text
    // That's fine -- the image itself is not rendered
  });

  // --- Link markdown is disallowed ---
  it("does not render <a> links from markdown link syntax", () => {
    renderContent("[click here](http://evil.com/phish)");
    // No <a href> in DOM
    expect(document.querySelector("a")).toBeNull();
    // With unwrapDisallowed, the link text "click here" is preserved but not clickable
    expect(screen.getByText("click here")).toBeInTheDocument();
  });

  // --- HTML images are stripped ---
  it("strips raw HTML <img> tags", () => {
    renderContent('<img src="http://evil.com/x.png" onerror="alert(1)">');
    // No <img> in DOM (skipHtml strips raw HTML; even if it rendered, allowedElements would drop it)
    expect(document.querySelector("img")).toBeNull();
  });

  // --- Nested dangerous content ---
  it("handles mixed safe + unsafe content cleanly", () => {
    const { container } = renderContent(
      '**Hello** <script>bad</script> - item\n[link](http://x.com) and `code`',
    );
    // Bold is rendered
    expect(screen.getByText("Hello").tagName).toBe("STRONG");
    // Script is absent
    expect(document.querySelector("script")).toBeNull();
    // Link is absent
    expect(document.querySelector("a")).toBeNull();
    // Code is rendered
    expect(screen.getByText("code").tagName).toBe("CODE");
    // The container includes "item" text somewhere (in a text node with other words)
    expect(container.textContent).toMatch(/item/);
  });
});
