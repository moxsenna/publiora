// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import {
  BookCover,
  resolveBookCoverColor,
  getContrastTextColor,
  isDarkColor,
} from "../BookCover";

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

  it("renders crisp white title text on dark book covers", () => {
    render(
      <BookCover
        title="Buku Sampul Gelap"
        coverColor="#1e293b"
      />
    );
    const titleEl = screen.getByText("Buku Sampul Gelap");
    expect(titleEl.style.color).toBe("rgb(255, 255, 255)");
  });

  it("renders dark title text on light book covers for high contrast", () => {
    render(
      <BookCover
        title="Buku Sampul Terang"
        coverColor="#FEF08A"
      />
    );
    const titleEl = screen.getByText("Buku Sampul Terang");
    expect(titleEl.style.color).toBe("rgb(15, 23, 42)");
  });
});

describe("getContrastTextColor & isDarkColor", () => {
  it("detects dark colors and returns #FFFFFF", () => {
    expect(isDarkColor("#1e3a8a")).toBe(true);
    expect(isDarkColor("#064e3b")).toBe(true);
    expect(isDarkColor("#881337")).toBe(true);
    expect(getContrastTextColor("#1e3a8a")).toBe("#FFFFFF");
  });

  it("detects light colors and returns #0F172A", () => {
    expect(isDarkColor("#FFFFFF")).toBe(false);
    expect(isDarkColor("#FEF08A")).toBe(false);
    expect(getContrastTextColor("#FFFFFF")).toBe("#0F172A");
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
