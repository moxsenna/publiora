// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { BookCover } from "../BookCover";

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
});
