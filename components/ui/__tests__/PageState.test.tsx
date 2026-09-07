// @vitest-environment jsdom

import * as React from "react";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { describe, it, expect } from "vitest";
import { LoadingState } from "@/components/ui/PageState";

describe("LoadingState Component", () => {
  it("renders spinner and breathing status text", () => {
    render(<LoadingState label="Memuat naskah…" />);
    const status = screen.getByRole("status");
    expect(status).toHaveTextContent("Memuat naskah…");
    const labelSpan = status.querySelector(".animate-pulse-soft");
    expect(labelSpan).not.toBeNull();
  });
});
