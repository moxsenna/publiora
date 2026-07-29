// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Modal } from "@/components/ui/Modal";

afterEach(() => { document.body.style.overflow = ""; });

function Fixture(props: Partial<React.ComponentProps<typeof Modal>> = {}) {
  return <Modal open onClose={vi.fn()} title="Dialog" {...props}><button>Pertama</button><button>Terakhir</button></Modal>;
}

describe("Modal", () => {
  it("focuses first control, traps focus both ways, locks body, and restores trigger", async () => {
    const user = userEvent.setup();
    const trigger = document.createElement("button");
    trigger.textContent = "Buka";
    document.body.append(trigger);
    trigger.focus();
    document.body.style.overflow = "scroll";
    const view = render(<Fixture />);
    const first = screen.getByRole("button", { name: "Tutup dialog" });
    const last = screen.getByRole("button", { name: "Terakhir" });
    await waitFor(() => expect(first).toHaveFocus());
    expect(document.body.style.overflow).toBe("hidden");
    await user.tab({ shift: true });
    expect(last).toHaveFocus();
    await user.tab();
    expect(first).toHaveFocus();
    view.unmount();
    expect(document.body.style.overflow).toBe("scroll");
    expect(trigger).toHaveFocus();
    trigger.remove();
  });

  it("moves outside focus to first modal control on forward Tab", async () => {
    const outside = document.createElement("button");
    outside.textContent = "Di luar";
    document.body.append(outside);
    render(<Fixture />);
    const first = screen.getByRole("button", { name: "Tutup dialog" });
    await waitFor(() => expect(first).toHaveFocus());

    outside.focus();
    fireEvent.keyDown(document, { key: "Tab" });

    expect(first).toHaveFocus();
    outside.remove();
  });

  it("uses its required title as the accessible dialog name", () => {
    render(<Fixture title="Nama dialog" />);
    expect(screen.getByRole("dialog", { name: "Nama dialog" })).toBeInTheDocument();
  });

  it("keeps focus on rerender and Escape uses latest callback and policies", async () => {
    const trigger = document.createElement("button");
    document.body.append(trigger);
    trigger.focus();
    const firstClose = vi.fn();
    const latestClose = vi.fn();
    const { rerender } = render(<Fixture onClose={firstClose} closeOnEscape={false} />);
    const second = screen.getByRole("button", { name: "Terakhir" });
    await waitFor(() => expect(screen.getByRole("button", { name: "Tutup dialog" })).toHaveFocus());
    second.focus();

    rerender(<Fixture onClose={() => latestClose()} closeOnEscape />);
    await new Promise((resolve) => window.setTimeout(resolve, 10));

    expect(second).toHaveFocus();
    fireEvent.keyDown(document, { key: "Escape" });
    expect(firstClose).not.toHaveBeenCalled();
    expect(latestClose).toHaveBeenCalledTimes(1);
    expect(second).toHaveFocus();
    trigger.remove();
  });

  it("respects escape, backdrop, and preventClose policies", () => {
    const onClose = vi.fn();
    const { rerender } = render(<Fixture onClose={onClose} closeOnEscape={false} closeOnBackdrop={false} />);
    fireEvent.keyDown(document, { key: "Escape" });
    fireEvent.click(screen.getByTestId("modal-backdrop"));
    expect(onClose).not.toHaveBeenCalled();

    rerender(<Fixture onClose={onClose} />);
    fireEvent.keyDown(document, { key: "Escape" });
    fireEvent.click(screen.getByTestId("modal-backdrop"));
    expect(onClose).toHaveBeenCalledTimes(2);

    onClose.mockClear();
    rerender(<Fixture onClose={onClose} preventClose />);
    fireEvent.keyDown(document, { key: "Escape" });
    fireEvent.click(screen.getByTestId("modal-backdrop"));
    fireEvent.click(screen.getByRole("button", { name: "Tutup dialog" }));
    expect(onClose).not.toHaveBeenCalled();
  });

  it("uses one dvh scroll container and mobile close target", () => {
    render(<Fixture />);
    expect(screen.getByRole("dialog").className).toContain("max-h-[calc(100dvh-2rem)]");
    expect(screen.getByRole("dialog").className).toContain("overflow-y-auto");
    expect(screen.getByRole("button", { name: "Tutup dialog" }).className).toContain("min-h-11");
  });
});
