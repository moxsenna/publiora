// @vitest-environment jsdom

import * as React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { describe, it, expect } from "vitest";
import { Dropdown } from "@/components/ui/Dropdown";

describe("Dropdown Animations", () => {
  it("opens menu with animate-scale-in class and transform origin", () => {
    render(
      <Dropdown
        trigger={<span>Options</span>}
        items={[{ label: "Action 1" }]}
      />
    );
    fireEvent.click(screen.getByRole("button", { name: "Menu" }));
    const menu = screen.getByRole("menu");
    expect(menu.className).toContain("animate-scale-in");
    expect(menu.className).toContain("origin-top-right");
  });
});
