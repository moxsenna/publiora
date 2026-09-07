// @vitest-environment jsdom

import * as React from "react";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { describe, it, expect } from "vitest";
import { Button } from "@/components/ui/Button";

describe("Button Micro-Interactions", () => {
  it("renders with tactile active:scale and transition classes", () => {
    render(<Button>Click me</Button>);
    const btn = screen.getByRole("button", { name: "Click me" });
    expect(btn.className).toContain("active:scale-[0.98]");
    expect(btn.className).toContain("transition-all");
    expect(btn.className).toContain("duration-150");
  });

  it("renders loading state with spinning loader indicator and disabled attribute", () => {
    render(<Button loading>Saving</Button>);
    const btn = screen.getByRole("button", { name: "Saving" });
    expect(btn).toBeDisabled();
    const spinner = btn.querySelector(".animate-spin");
    expect(spinner).not.toBeNull();
  });

  it("replaces children with spinner when size is icon and loading", () => {
    render(
      <Button loading size="icon" aria-label="Send">
        <span data-testid="send-icon">Icon</span>
      </Button>
    );
    const btn = screen.getByRole("button", { name: "Send" });
    expect(btn).toBeDisabled();
    expect(btn.querySelector(".animate-spin")).not.toBeNull();
    expect(screen.queryByTestId("send-icon")).toBeNull();
  });

  it("suppresses active scale when disabled", () => {
    render(<Button disabled>Disabled</Button>);
    const btn = screen.getByRole("button", { name: "Disabled" });
    expect(btn.className).toContain("disabled:active:scale-100");
  });
});
