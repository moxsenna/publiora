// @vitest-environment jsdom

import * as React from "react";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { describe, it, expect } from "vitest";
import { LoadingDots } from "@/components/ui/LoadingDots";

describe("LoadingDots Component", () => {
  it("renders 3 sequential animated dots with role status", () => {
    render(<LoadingDots label="Berpikir…" />);
    const container = screen.getByRole("status");
    expect(container).toHaveAttribute("aria-label", "Berpikir…");
    const dots = container.querySelectorAll(".animate-pulse-dot");
    expect(dots.length).toBe(3);
  });
});
