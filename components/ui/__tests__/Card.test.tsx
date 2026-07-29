// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Card, CardBody, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/Card";

describe("Card", () => {
  it("preserves exports and uses shared premium tokens", () => {
    render(<Card data-testid="card"><CardHeader><CardTitle>Judul</CardTitle><CardDescription>Deskripsi</CardDescription></CardHeader><CardBody>Isi</CardBody><CardFooter>Aksi</CardFooter></Card>);
    const card = screen.getByTestId("card");
    expect(card.className).toContain("rounded-[var(--radius-card)]");
    expect(card.className).toContain("border-[var(--color-border-subtle)]");
    expect(card.className).toContain("shadow-[var(--shadow-card)]");
  });

  it("keeps long content safe and shows focus within for caller-interactive cards", () => {
    render(<Card className="cursor-pointer"><CardBody><button>Nama sangat panjang</button></CardBody></Card>);
    const card = screen.getByRole("button").parentElement?.parentElement;
    expect(card?.className).toContain("min-w-0");
    expect(card?.className).toContain("break-words");
    expect(card?.className).toContain("focus-within:ring-2");
    expect(screen.getByRole("button").parentElement?.className).toContain("px-4");
    expect(screen.getByRole("button").parentElement?.className).toContain("sm:px-5");
  });
});
