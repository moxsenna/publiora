// @vitest-environment jsdom

import * as React from "react";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { describe, it, expect, vi } from "vitest";
import { Toaster } from "@/components/ui/Toaster";

vi.mock("@/store/projectStore", () => ({
  useUiStore: (selector: (state: { toasts: Array<{ id: string; title: string; variant: "default" | "success" | "danger" }>; dismissToast: () => void }) => unknown) =>
    selector({
      toasts: [{ id: "t1", title: "Berhasil disimpan", variant: "success" }],
      dismissToast: vi.fn(),
    }),
}));

describe("Toaster Animations", () => {
  it("renders toast card with animate-toast-in class", () => {
    render(<Toaster />);
    const toastTitle = screen.getByText("Berhasil disimpan");
    const toastCard = toastTitle.closest(".animate-toast-in");
    expect(toastCard).not.toBeNull();
  });
});
