// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import DashboardPage from "./page";

const refetchProjects = vi.fn();
const refetchPublished = vi.fn();
const refetchBalance = vi.fn();
const useProjects = vi.fn();
const usePublishedEbooks = vi.fn();
const useCreditBalance = vi.fn();

vi.mock("@/lib/api/hooks", () => ({
  useProjects: () => useProjects(),
  usePublishedEbooks: () => usePublishedEbooks(),
  useCreditBalance: () => useCreditBalance(),
}));

vi.mock("@/store/authStore", () => ({
  useAuthStore: (selector: (state: { profile: { name: string } }) => unknown) =>
    selector({ profile: { name: "Ayu" } }),
}));

beforeEach(() => {
  refetchProjects.mockReset();
  refetchPublished.mockReset();
  refetchBalance.mockReset();
  useProjects.mockReturnValue({ data: [], isLoading: false, isError: true, refetch: refetchProjects });
  usePublishedEbooks.mockReturnValue({ data: [], isLoading: false, isError: true, refetch: refetchPublished });
  useCreditBalance.mockReturnValue({ data: undefined, isLoading: false, isError: true, refetch: refetchBalance });
});

afterEach(cleanup);

describe("statistik dashboard", () => {
  it("menampilkan data tidak tersedia, bukan nol, saat kueri gagal", () => {
    render(<DashboardPage />);

    for (const label of ["Kredit", "Proyek", "Terbit", "Total pembaca", "Klaim aktif"]) {
      const stat = screen.getByText(label).closest('[role="article"]');
      expect(stat).toHaveTextContent("Data tidak tersedia");
      expect(stat).not.toHaveTextContent(/\b0\b/);
    }
  });

  it("mencoba ulang kueri yang benar dari setiap statistik gagal", async () => {
    const user = userEvent.setup();
    render(<DashboardPage />);

    await user.click(screen.getByRole("button", { name: "Coba lagi Kredit" }));
    await user.click(screen.getByRole("button", { name: "Coba lagi Proyek" }));
    await user.click(screen.getByRole("button", { name: "Coba lagi Terbit" }));
    await user.click(screen.getByRole("button", { name: "Coba lagi Total pembaca" }));
    await user.click(screen.getByRole("button", { name: "Coba lagi Klaim aktif" }));

    expect(refetchBalance).toHaveBeenCalledTimes(1);
    expect(refetchProjects).toHaveBeenCalledTimes(1);
    expect(refetchPublished).toHaveBeenCalledTimes(3);
  });
});
