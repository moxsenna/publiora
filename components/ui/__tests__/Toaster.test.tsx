// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";

import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { Toaster } from "@/components/ui/Toaster";
import { useUiStore } from "@/store/projectStore";

beforeEach(() => useUiStore.setState({ toasts: [] }));

describe("Toaster", () => {
  it("announces danger as alert and other items as status without container announcement", () => {
    useUiStore.setState({ toasts: [
      { id: "same", title: "Gagal", variant: "danger" },
      { id: "same", title: "Duplikat", variant: "danger" },
      { id: "ok", title: "Berhasil", variant: "success" },
    ] });
    render(<Toaster />);
    expect(screen.getAllByRole("alert")).toHaveLength(1);
    expect(screen.getAllByRole("status")).toHaveLength(1);
    expect(screen.queryByText("Duplikat")).toBeNull();
    expect(screen.getByTestId("toast-container")).not.toHaveAttribute("aria-live");
  });

  it("dismisses by stable ID with Indonesian 44px close control", () => {
    useUiStore.setState({ toasts: [{ id: "toast-1", title: "Info", variant: "default" }] });
    render(<Toaster />);
    const close = screen.getByRole("button", { name: "Tutup notifikasi" });
    expect(close.className).toContain("min-h-11");
    fireEvent.click(close);
    expect(useUiStore.getState().toasts).toHaveLength(0);
  });
});
