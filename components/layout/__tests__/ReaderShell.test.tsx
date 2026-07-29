// @vitest-environment jsdom

import * as React from "react";
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ReaderShell } from "../ReaderShell";

vi.mock("next/link", () => ({
  default: ({ children, href, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) => (
    <a href={href} {...props}>{children}</a>
  ),
}));

afterEach(cleanup);

describe("ReaderShell", () => {
  it("uses Indonesian defaults", () => {
    render(<ReaderShell>Isi</ReaderShell>);
    expect(screen.getByRole("link", { name: /pustaka/i })).toHaveAttribute("href", "/library");
    expect(screen.getByText("Pembaca Publiora")).toBeInTheDocument();
  });

  it("preserves back link and reader title overrides", () => {
    render(<ReaderShell backHref="/koleksi" backLabel="Kembali" readerLabel="Pratinjau Buku">Isi</ReaderShell>);
    expect(screen.getByRole("link", { name: /kembali/i })).toHaveAttribute("href", "/koleksi");
    expect(screen.getByText("Pratinjau Buku")).toBeInTheDocument();
  });
});
