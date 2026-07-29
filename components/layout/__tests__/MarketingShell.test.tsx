// @vitest-environment jsdom

import * as React from "react";
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MarketingShell } from "../MarketingShell";
import { useAuthStore } from "@/store/authStore";

vi.mock("next/link", () => ({
  default: ({ children, href, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) => (
    <a href={href} {...props}>{children}</a>
  ),
}));

beforeEach(() => useAuthStore.setState({ profile: null }));
afterEach(cleanup);

describe("MarketingShell mobile disclosure", () => {
  it("uses Indonesian disclosure semantics and conditionally renders controls", async () => {
    const user = userEvent.setup();
    render(<MarketingShell><p>Isi</p></MarketingShell>);
    const trigger = screen.getByRole("button", { name: "Buka menu navigasi" });
    expect(trigger).toHaveAttribute("aria-controls", "marketing-mobile-navigation");
    expect(trigger).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByRole("navigation", { name: "Navigasi seluler" })).not.toBeInTheDocument();

    await user.click(trigger);
    expect(screen.getByRole("navigation", { name: "Navigasi seluler" })).toHaveAttribute("id", "marketing-mobile-navigation");
    expect(trigger).toHaveAttribute("aria-expanded", "true");
    expect(trigger).toHaveAccessibleName("Tutup menu navigasi");
  });

  it("closes with Escape and restores trigger focus", async () => {
    const user = userEvent.setup();
    render(<MarketingShell><p>Isi</p></MarketingShell>);
    const trigger = screen.getByRole("button", { name: "Buka menu navigasi" });
    await user.click(trigger);
    within(screen.getByRole("navigation", { name: "Navigasi seluler" })).getByRole("link", { name: "Fitur" }).focus();
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("navigation", { name: "Navigasi seluler" })).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });

  it("closes after link selection", async () => {
    const user = userEvent.setup();
    render(<MarketingShell><p>Isi</p></MarketingShell>);
    await user.click(screen.getByRole("button", { name: "Buka menu navigasi" }));
    await user.click(within(screen.getByRole("navigation", { name: "Navigasi seluler" })).getByRole("link", { name: "Cara kerja" }));
    expect(screen.queryByRole("navigation", { name: "Navigasi seluler" })).not.toBeInTheDocument();
  });

  it("localizes shared shell and footer copy", () => {
    render(<MarketingShell><p>Isi</p></MarketingShell>);
    expect(screen.getAllByRole("link", { name: "Dasbor" }).length).toBeGreaterThan(0);
    expect(screen.getByText("Buat, terbitkan, dan distribusikan ebook pemasaran dengan AI.")).toBeInTheDocument();
  });
});
