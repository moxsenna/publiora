// @vitest-environment jsdom

import * as React from "react";
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Sidebar, MobileSidebar } from "../Sidebar";
import { TopBar } from "../TopBar";
import { useUiStore } from "@/store/projectStore";
import { useAuthStore } from "@/store/authStore";

let pathname = "/projects";
const replace = vi.fn();
const push = vi.fn();

vi.mock("next/navigation", () => ({
  usePathname: () => pathname,
  useRouter: () => ({ replace, push }),
}));

vi.mock("next/link", () => ({
  default: ({ children, href, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) => (
    <a href={href} {...props}>{children}</a>
  ),
}));

beforeEach(() => {
  pathname = "/projects";
  replace.mockReset();
  push.mockReset();
  useUiStore.setState({ sidebarOpen: true, mobileNavOpen: false });
  useAuthStore.setState({
    initialized: true,
    profile: {
      id: "user-1",
      name: null,
      email: "pengguna@example.com",
      avatar_url: null,
      role: "user",
      plan: "free",
      created_at: "2026-01-01",
      updated_at: "2026-01-01",
      signup_origin: "unattributed",
      initial_intent: null,
      first_claim_link_id: null,
      first_claim_ebook_id: null,
      first_claim_creator_id: null,
      reader_activated_at: null,
      creator_activated_at: null,
      creator_subscribed_at: null,
      marketing_email_consent: false,
      marketing_email_consent_at: null,
      marketing_email_consent_source: null,
    },
  });
});

afterEach(() => {
  cleanup();
  document.body.style.overflow = "";
});

describe("Sidebar", () => {
  it("uses Indonesian catalog labels, fallback user, and active page state", () => {
    render(<Sidebar />);

    for (const label of ["Dasbor", "Proyek", "Produk & Penawaran", "Pustaka", "Tagihan", "Proyek Baru"]) {
      expect(screen.getByRole("link", { name: label })).toBeInTheDocument();
    }
    expect(screen.getByText("Pengguna")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Proyek" })).toHaveAttribute("aria-current", "page");
  });

  it("removes collapsed desktop navigation from focus and accessibility while keeping expand available", async () => {
    const user = userEvent.setup();
    render(<><Sidebar /><TopBar /></>);

    const collapse = screen.getAllByRole("button", { name: "Ciutkan panel samping" }).at(-1)!;
    await user.click(collapse);

    expect(screen.queryByRole("navigation", { name: "Navigasi utama" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Proyek Baru" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Bentangkan panel samping" })).toBeInTheDocument();
    expect(document.querySelector("aside")?.querySelectorAll("a, button")).toHaveLength(0);
  });
});

describe("mobile app drawer", () => {
  it("exposes stable trigger and blocking named dialog semantics", async () => {
    const user = userEvent.setup();
    render(<><TopBar /><MobileSidebar /></>);

    const trigger = screen.getByRole("button", { name: "Buka menu" });
    expect(trigger).toHaveAttribute("aria-controls", "app-navigation-drawer");
    
    // Initially should be false since mobileNavOpen starts as false
    expect(trigger).toHaveAttribute("aria-expanded", "false");

    await user.click(trigger);
    
    // After click, dialog should exist and be focused
    const dialog = screen.getByRole("dialog", { name: "Navigasi utama" });
    expect(dialog).toHaveAttribute("id", "app-navigation-drawer");
    expect(dialog).toHaveAttribute("aria-modal", "true");
    
    // Trigger should now have aria-expanded="true" after opening
    expect(trigger).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByTestId("mobile-navigation-backdrop")).toHaveAttribute("aria-hidden", "true");
    expect(screen.getByTestId("mobile-navigation-backdrop")).not.toHaveAttribute("tabindex");
    await waitFor(() => expect(dialog).toContainElement(document.activeElement as HTMLElement));
    expect(document.body.style.overflow).toBe("hidden");
  });

  it("contains focus, closes with Escape, restores body and trigger focus", async () => {
    const user = userEvent.setup();
    document.body.style.overflow = "clip";
    render(<><TopBar /><MobileSidebar /></>);
    const trigger = screen.getByRole("button", { name: "Buka menu" });
    await user.click(trigger);
    const close = screen.getAllByRole("button", { name: "Tutup menu" }).at(-1)!;
    close.focus();
    await user.keyboard("{Shift>}{Tab}{/Shift}");
    expect(screen.getByRole("dialog")).toContainElement(document.activeElement as HTMLElement);

    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(document.body.style.overflow).toBe("clip");
    expect(trigger).toHaveFocus();
  });

  it("closes after navigation", async () => {
    const user = userEvent.setup();
    render(<><TopBar /><MobileSidebar /></>);
    await user.click(screen.getByRole("button", { name: "Buka menu" }));
    await user.click(screen.getAllByRole("link", { name: "Pustaka" }).at(-1)!);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});

describe("TopBar titles", () => {
  it.each([
    ["/dashboard", "Dasbor"],
    ["/projects/abc", "Proyek"],
    ["/offers", "Produk & Penawaran"],
    ["/library/book", "Pustaka"],
    ["/settings/billing", "Tagihan"],
  ])("maps %s to %s", (route, expected) => {
    pathname = route;
    render(<TopBar />);
    expect(screen.getByRole("heading", { name: expected })).toBeInTheDocument();
    cleanup();
  });

  it("lets explicit title win and never renders a raw segment", () => {
    pathname = "/projects/raw-secret-slug";
    const { rerender } = render(<TopBar title="Judul Khusus" />);
    expect(screen.getByRole("heading", { name: "Judul Khusus" })).toBeInTheDocument();
    rerender(<TopBar />);
    expect(screen.queryByText("raw-secret-slug")).not.toBeInTheDocument();
  });
});
