// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Button } from "@/components/ui/Button";

describe("Button", () => {
  it("exposes loading state and disables interaction", () => {
    render(<Button loading loadingLabel="Menyimpan">Simpan</Button>);
    const button = screen.getByRole("button", { name: "Simpan" });
    expect(button.getAttribute("aria-busy")).toBe("true");
    expect(button).toBeDisabled();
    expect(button.querySelector("[aria-hidden='true']")).not.toBeNull();
  });

  it("uses loadingLabel as accessible name for icon-only loading buttons", () => {
    render(<Button size="icon" loading loadingLabel="Menyimpan" aria-label="Simpan" />);
    expect(screen.getByRole("button", { name: "Menyimpan" })).toBeDisabled();
  });

  it("keeps mobile target at least 44px and desktop density", () => {
    render(<Button size="sm">Simpan</Button>);
    const classes = screen.getByRole("button").className;
    expect(classes).toContain("min-h-11");
    expect(classes).toContain("sm:min-h-0");
    expect(classes).toContain("sm:h-8");
  });
});
