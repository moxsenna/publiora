// @vitest-environment jsdom

import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import * as React from "react";
import { EnhancementMenu } from "@/components/workspace/EnhancementMenu";

describe("EnhancementMenu", () => {
  it("memfokuskan tindakan pertama dan mendukung navigasi keyboard", () => {
    render(<EnhancementMenu onAction={vi.fn()} />);

    const trigger = screen.getByRole("button", { name: "Tingkatkan bagian" });
    fireEvent.click(trigger);

    const items = screen.getAllByRole("menuitem");
    expect(items[0]).toHaveFocus();
    expect(items[0]).toHaveTextContent("Perluas");

    fireEvent.keyDown(items[0], { key: "End" });
    expect(items.at(-1)).toHaveFocus();
    fireEvent.keyDown(items.at(-1)!, { key: "Home" });
    expect(items[0]).toHaveFocus();
    fireEvent.keyDown(items[0], { key: "ArrowDown" });
    expect(items[1]).toHaveFocus();
    fireEvent.keyDown(items[1], { key: "Escape" });
    expect(trigger).toHaveFocus();
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  });
});
