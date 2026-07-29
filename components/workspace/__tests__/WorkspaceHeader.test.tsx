// @vitest-environment jsdom

import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import * as React from "react";
import { WorkspaceHeader } from "@/components/workspace/WorkspaceHeader";

vi.mock("next/link", () => ({ default: ({ children, href }: React.PropsWithChildren<{ href: string }>) => <a href={href}>{children}</a> }));

describe("WorkspaceHeader", () => {
  it("menampilkan tindakan ruang kerja dalam Bahasa Indonesia", () => {
    render(<WorkspaceHeader project={undefined} isLoading={false} onPreview={vi.fn()} onDelete={vi.fn()} />);

    expect(screen.getByRole("button", { name: "Kembali ke proyek" }).closest("a")).toHaveAttribute("href", "/projects");
    expect(screen.getByRole("button", { name: "Pratinjau ebook" })).toBeVisible();
    expect(screen.getByRole("button", { name: "Hapus proyek" })).toBeVisible();
    expect(screen.getByRole("heading", { name: "Tanpa judul" })).toBeVisible();
  });
});
