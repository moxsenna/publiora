// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { Tabs } from "@/components/ui/Tabs";

const tabs = [{ value: "satu", label: "Satu", content: "Panel satu" }, { value: "dua", label: "Dua", content: "Panel dua" }, { value: "tiga", label: "Tiga", content: "Panel tiga" }];

describe("Tabs", () => {
  it("uses roving tabindex, linked panels, and mobile-safe layout", () => {
    render(<Tabs value="dua" onChange={vi.fn()} tabs={tabs} />);
    const active = screen.getByRole("tab", { name: "Dua" });
    expect(active).toHaveAttribute("tabindex", "0");
    expect(screen.getByRole("tab", { name: "Satu" })).toHaveAttribute("tabindex", "-1");
    expect(active.getAttribute("aria-controls")).toBe(screen.getByRole("tabpanel").id);
    expect(screen.getByRole("tabpanel")).toHaveTextContent("Panel dua");
    expect(screen.getByRole("tablist").className).toContain("overflow-x-auto");
    expect(active.className).toContain("min-h-11");
  });

  it.each([["ArrowRight", "Dua"], ["ArrowLeft", "Tiga"], ["Home", "Satu"], ["End", "Tiga"]])("handles %s navigation", async (key, expected) => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<Tabs value="satu" onChange={onChange} tabs={tabs} />);
    screen.getByRole("tab", { name: "Satu" }).focus();
    await user.keyboard(`{${key}}`);
    expect(onChange).toHaveBeenCalledWith(expected.toLowerCase());
    expect(screen.getByRole("tab", { name: expected })).toHaveFocus();
  });

  it("falls back to first enabled tab for an unknown value", () => {
    render(<Tabs value="tidak-ada" onChange={vi.fn()} tabs={tabs} />);
    expect(screen.getByRole("tab", { name: "Satu" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("tab", { name: "Satu" })).toHaveAttribute("tabindex", "0");
    expect(screen.getByRole("tabpanel")).toHaveTextContent("Panel satu");
  });

  it("falls back to first enabled tab when selected value is disabled", () => {
    render(<Tabs value="satu" onChange={vi.fn()} tabs={[{ ...tabs[0], disabled: true }, tabs[1]]} />);
    expect(screen.getByRole("tab", { name: "Satu" })).toHaveAttribute("aria-selected", "false");
    expect(screen.getByRole("tab", { name: "Satu" })).toHaveAttribute("tabindex", "-1");
    expect(screen.getByRole("tab", { name: "Dua" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("tab", { name: "Dua" })).toHaveAttribute("tabindex", "0");
    expect(screen.getByRole("tabpanel")).toHaveTextContent("Panel dua");
  });

  it("renders no focusable or selected tabs when empty", () => {
    render(<Tabs value="satu" onChange={vi.fn()} tabs={[]} />);
    expect(screen.queryAllByRole("tab")).toHaveLength(0);
    expect(screen.queryByRole("tabpanel")).toBeNull();
  });

  it("renders no focusable or selected tabs when all are disabled", () => {
    render(<Tabs value="satu" onChange={vi.fn()} tabs={tabs.map((tab) => ({ ...tab, disabled: true }))} />);
    for (const tab of screen.getAllByRole("tab")) {
      expect(tab).toHaveAttribute("aria-selected", "false");
      expect(tab).toHaveAttribute("tabindex", "-1");
    }
    expect(screen.queryByRole("tabpanel")).toBeNull();
  });

  it("remains backward compatible when tab content is omitted", () => {
    render(<Tabs value="satu" onChange={vi.fn()} tabs={[{ value: "satu", label: "Satu" }]} />);
    expect(screen.queryByRole("tabpanel")).toBeNull();
  });
});
