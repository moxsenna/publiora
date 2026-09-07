// @vitest-environment jsdom
import * as React from "react";
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { PublishedEbook } from "@/types";
import { buildPublishedReaderDocument } from "@/lib/reader/build-published-reader-document";

const mutate = vi.fn();
vi.mock("@/lib/api/hooks", () => ({ useUpdateReadingProgress: () => ({ mutate }) }));
vi.mock("next/link", () => ({ default: ({ children, href, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) => <a href={href} {...props}>{children}</a> }));

import { Reader } from "../Reader";

const ebook: PublishedEbook = {
  id: "ebook-1", project_id: "project-1", slug: "buku", title: "Buku", author: "Ayu", subtitle: null,
  cover_color: "#123456", published_at: "2026-01-01", total_readers: 0, active_claims: 0, is_public: true,
  cta_goal: null, final_cta: "Kunjungi situs", cta_url: "https://example.com", sections: [
    { id: "s1", position: 1, title: "Awal", content_html: "<p>Isi</p>" },
    { id: "s2", position: 2, title: "Akhir", content_html: "<p>Selesai</p>" },
  ],
};

function renderReader(overrides: Partial<PublishedEbook> = {}, mode: "creator_preview" | "claimed_reader" = "claimed_reader") {
  return render(
    <Reader
      document={buildPublishedReaderDocument({ ...ebook, ...overrides })}
      mode={mode}
      backHref={mode === "creator_preview" ? "/projects/project-1" : "/library"}
      backLabel={mode === "creator_preview" ? "Kembali ke proyek" : "Kembali ke Pustaka"}
    />
  );
}

beforeEach(() => {
  mutate.mockReset();
  vi.stubGlobal("IntersectionObserver", class { observe() {} disconnect() {} });
  vi.stubGlobal("matchMedia", vi.fn().mockReturnValue({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() }));
  Element.prototype.scrollIntoView = vi.fn();
});
afterEach(() => { cleanup(); document.body.style.overflow = ""; vi.unstubAllGlobals(); });

describe("Reader", () => {
  it("sends 1-based progress payload and guards an ebook with zero sections", () => {
    const { unmount } = renderReader();
    expect(mutate).toHaveBeenCalledWith({ ebook_id: "ebook-1", patch: { progress: 50, current_section: 1 } });
    unmount(); mutate.mockClear();
    renderReader({ sections: [] });
    expect(mutate).not.toHaveBeenCalled();
  });

  it("never sends progress in creator preview mode", () => {
    const { unmount } = renderReader({}, "creator_preview");
    expect(mutate).not.toHaveBeenCalled();
    unmount();
  });

  it("shows the preview banner in creator preview mode only", () => {
    renderReader({}, "creator_preview");
    expect(screen.getByText("Pratinjau sebagai pembaca")).toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: "Kembali ke proyek" }).length).toBeGreaterThan(0);
    cleanup();
    renderReader();
    expect(screen.queryByText("Pratinjau sebagai pembaca")).not.toBeInTheDocument();
  });

  it("opens named modal TOC, traps focus, closes with Escape, restores focus and body lock", async () => {
    const user = userEvent.setup();
    document.body.style.overflow = "clip";
    renderReader();
    const trigger = screen.getByRole("button", { name: "Buka daftar isi" });
    expect(trigger).toHaveAttribute("aria-expanded", "false");
    await user.click(trigger);
    const dialog = screen.getByRole("dialog", { name: "Daftar isi" });
    expect(trigger).toHaveAttribute("aria-expanded", "true");
    await waitFor(() => expect(dialog).toContainElement(document.activeElement as HTMLElement));
    expect(document.body.style.overflow).toBe("hidden");
    await user.keyboard("{Shift>}{Tab}{/Shift}");
    expect(dialog).toContainElement(document.activeElement as HTMLElement);
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(document.body.style.overflow).toBe("clip");
    expect(trigger).toHaveFocus();
  });

  it("uses localized reader copy at HTML boundaries", () => {
    renderReader();
    expect(screen.getByText(/pindah bagian/)).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: /Kembali ke Pustaka/ }).length).toBeGreaterThan(0);
  });

  it("sanitizes section HTML at render boundary while preserving approved formatting", () => {
    const unsafeHtml = [
      '<p>Paragraf <strong>tebal</strong> dan <em>miring</em>.</p>',
      '<ul><li>Daftar aman</li></ul>',
      '<a href="https://example.org/resource">Tautan aman</a>',
      '<script>window.__readerXss = true</script>',
      '<img src="x" onerror="window.__readerXss = true">',
      '<a href="javascript:window.__readerXss = true" onclick="window.__readerXss = true">Tautan jahat</a>',
    ].join("");
    const { container } = renderReader({ sections: [{ ...ebook.sections[0], content_html: unsafeHtml }] });

    expect(screen.getByText("tebal").tagName).toBe("STRONG");
    expect(screen.getByText("miring").tagName).toBe("EM");
    expect(screen.getByText("Daftar aman").closest("ul")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Tautan aman" })).toHaveAttribute("href", "https://example.org/resource");
    expect(container.querySelector("script")).not.toBeInTheDocument();
    expect(container.querySelector("[onerror], [onclick]")).not.toBeInTheDocument();
    expect(screen.getByText("Tautan jahat").closest("a")).not.toHaveAttribute("href");
    expect((window as Window & { __readerXss?: boolean }).__readerXss).toBeUndefined();
  });

  it("ignores reader shortcuts on interactive elements and respects reduced motion", async () => {
    vi.mocked(matchMedia).mockReturnValue({ matches: true, addEventListener: vi.fn(), removeEventListener: vi.fn() } as unknown as MediaQueryList);
    const user = userEvent.setup();
    renderReader();
    const external = screen.getByRole("link", { name: "Kunjungi situs" });
    expect(external).toHaveAttribute("rel", "noopener noreferrer");
    external.focus();
    await user.keyboard("j");
    expect(Element.prototype.scrollIntoView).not.toHaveBeenCalled();
    await user.click(screen.getAllByRole("button", { name: "2.Akhir" }).at(-1)!);
    expect(Element.prototype.scrollIntoView).toHaveBeenCalledWith({ behavior: "auto", block: "start" });
  });
});
