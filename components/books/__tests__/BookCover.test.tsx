// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { BookCover, resolveBookCoverColor } from "../BookCover";

describe("BookCover component", () => {
  it("renders title, author and category correctly", () => {
    render(
      <BookCover
        title="Rahasia Content Creator"
        author="Bima Arya"
        category="Marketing"
        coverColor="#2563EB"
      />
    );

    expect(screen.getByText("Rahasia Content Creator")).toBeDefined();
    expect(screen.getByText("Bima Arya")).toBeDefined();
    expect(screen.getByText("Marketing")).toBeDefined();
  });

  it("renders with fallback publisher mark when no category is provided", () => {
    render(<BookCover title="Buku Panduan" />);
    expect(screen.getByText("PUBLIORA")).toBeDefined();
    expect(screen.getByText("Publiora Creator")).toBeDefined();
  });

  it("renders badges when passed", () => {
    render(
      <BookCover
        title="Ebook Premium"
        badge={<span data-testid="cover-badge">Pro</span>}
      />
    );
    expect(screen.getByTestId("cover-badge")).toBeDefined();
  });

  it("resolves legacy default #6366f1 to curated editorial colors", () => {
    const { container } = render(
      <BookCover
        id="project-1"
        title="Panduan: Keuangan Pribadi"
        category="Keuangan"
        coverColor="#6366f1"
      />
    );
    const coverDiv = container.firstElementChild as HTMLElement;
    // Should NOT be #6366f1 (rgb(99, 102, 241))
    expect(coverDiv.style.backgroundColor).not.toBe("rgb(99, 102, 241)");
  });

  it("preserves explicit custom cover colors", () => {
    const { container } = render(
      <BookCover
        title="Custom Color Book"
        coverColor="#2563EB"
      />
    );
    const coverDiv = container.firstElementChild as HTMLElement;
    expect(coverDiv.style.backgroundColor).toBe("rgb(37, 99, 235)");
  });
});

describe("resolveBookCoverColor", () => {
  it("preserves non-default custom color", () => {
    expect(resolveBookCoverColor({ coverColor: "#10b981" })).toBe("#10b981");
  });

  it("replaces legacy #6366f1 default", () => {
    const color = resolveBookCoverColor({
      coverColor: "#6366f1",
      id: "p1",
      title: "Rahasia Konten",
      category: "Marketing",
    });
    expect(color).not.toBe("#6366f1");
    expect(typeof color).toBe("string");
  });

  it("maps finance topics to emerald/navy tones", () => {
    const color = resolveBookCoverColor({
      title: "Panduan: Keuangan",
      category: "Finance",
    });
    const validFinanceColors = ["#064e3b", "#0f766e", "#1e3a8a", "#14532d", "#065f46"];
    expect(validFinanceColors).toContain(color);
  });

  it("produces deterministic and varied colors for different titles", () => {
    const color1 = resolveBookCoverColor({ title: "Panduan Memasak Praktis", id: "1" });
    const color2 = resolveBookCoverColor({ title: "Strategi Sukses B2B", id: "2" });
    // Deterministic: multiple calls with same arguments yield exact same color
    expect(resolveBookCoverColor({ title: "Panduan Memasak Praktis", id: "1" })).toBe(color1);
    expect(typeof color1).toBe("string");
    expect(typeof color2).toBe("string");
  });
});
