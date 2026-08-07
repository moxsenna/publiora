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

const profileRef = vi.hoisted(() => ({
  value: { name: "Ayu" as string, signup_origin: undefined as string | undefined },
}));

vi.mock("@/lib/api/hooks", () => ({
  useProjects: () => useProjects(),
  usePublishedEbooks: () => usePublishedEbooks(),
  useCreditBalance: () => useCreditBalance(),
}));

vi.mock("@/store/authStore", () => ({
  useAuthStore: (selector: (state: { profile: { name: string; signup_origin?: string } }) => unknown) =>
    selector({ profile: profileRef.value }),
}));

beforeEach(() => {
  profileRef.value = { name: "Ayu", signup_origin: undefined };
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

describe("kartu undangan pembaca-ke-kreator", () => {
  const inviteTitle = "Punya pengetahuan yang ingin dibagikan?";
  const readyProjects = () => ({ data: [], isLoading: false, isError: false, refetch: refetchProjects });

  it("tidak muncul untuk pengguna dengan origin selain claim_link", () => {
    profileRef.value = { name: "Ayu", signup_origin: "landing_page" };
    useProjects.mockReturnValue(readyProjects());

    render(<DashboardPage />);

    expect(screen.queryByText(inviteTitle)).not.toBeInTheDocument();
  });

  it("muncul hanya untuk origin claim_link tanpa proyek", () => {
    profileRef.value = { name: "Ayu", signup_origin: "claim_link" };
    useProjects.mockReturnValue(readyProjects());

    render(<DashboardPage />);

    expect(screen.getByText(inviteTitle)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Buat ebook pertama" })).toHaveAttribute("href", "/projects/new");
  });

  it("menghilang setelah proyek pertama dibuat", () => {
    profileRef.value = { name: "Ayu", signup_origin: "claim_link" };
    useProjects.mockReturnValue({
      data: [{ id: "p1", title: "Proyek pertama", updated_at: "2026-08-01T00:00:00.000Z", cover_color: "#123456", status: "draft", progress: 0 }],
      isLoading: false,
      isError: false,
      refetch: refetchProjects,
    });

    render(<DashboardPage />);

    expect(screen.queryByText(inviteTitle)).not.toBeInTheDocument();
  });

  it("tidak muncul sambil kueri proyek masih dimuat", () => {
    profileRef.value = { name: "Ayu", signup_origin: "claim_link" };
    useProjects.mockReturnValue({ data: undefined, isLoading: true, isError: false, refetch: refetchProjects });

    render(<DashboardPage />);

    expect(screen.queryByText(inviteTitle)).not.toBeInTheDocument();
  });
});
