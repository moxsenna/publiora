// @vitest-environment jsdom

import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom/vitest";
import * as React from "react";

const pushMock = vi.fn();
const mutateAsyncMock = vi.fn();
const pushToastMock = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock }),
}));

vi.mock("next/link", () => ({
  default: ({
    children,
    href,
  }: {
    children: React.ReactNode;
    href: string;
  }) => <a href={href}>{children}</a>,
}));

vi.mock("@/lib/api/hooks", () => ({
  useCreateProject: () => ({
    mutateAsync: mutateAsyncMock,
    isPending: false,
  }),
  useMe: () => ({
    data: {
      user: { id: "u1", email: "creator@example.com" },
      profile: { name: "Creator Test", email: "creator@example.com" },
    },
  }),
}));

vi.mock("@/store/projectStore", () => ({
  useUiStore: (selector?: (s: { pushToast: typeof pushToastMock }) => unknown) => {
    const state = { pushToast: pushToastMock };
    return selector ? selector(state) : state;
  },
}));

import { NewProjectWizard } from "@/components/projects/new/NewProjectWizard";

describe("NewProjectWizard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mutateAsyncMock.mockResolvedValue({ id: "proj-new-1" });
  });

  it("renders four-step Indonesian shell", async () => {
    render(<NewProjectWizard />);
    expect(
      screen.getByRole("heading", { name: "Buat Proyek Baru" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Apa yang ingin Anda buat?")).toBeInTheDocument();
    expect(screen.getByText("Bonus Pembelian")).toBeInTheDocument();
    expect(screen.getByText("Ebook Berbayar")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Lanjutkan" })).toBeInTheDocument();
  });

  it("blocks advance from brief when required fields empty", async () => {
    const user = userEvent.setup();
    render(<NewProjectWizard />);
    await user.click(screen.getByRole("button", { name: "Lanjutkan" }));
    expect(await screen.findByText("Lengkapi brief")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Lanjutkan" }));
    await waitFor(() => {
      expect(
        screen.getAllByText(/Perbaiki field yang wajib diisi|Masukkan topik/i)
          .length,
      ).toBeGreaterThan(0);
    });
    expect(screen.queryByText("Format yang direkomendasikan")).not.toBeInTheDocument();
  });

  it("submits lead magnet V2 payload and redirects to strategy", async () => {
    const user = userEvent.setup();
    render(<NewProjectWizard />);

    await user.click(screen.getByRole("button", { name: /Lead Magnet/i }));
    await user.click(screen.getByRole("button", { name: "Lanjutkan" }));

    await user.type(screen.getByLabelText("Topik utama"), "Lead Gen B2B");
    await user.type(
      screen.getByLabelText("Target pembaca"),
      "Founder SaaS tahap awal",
    );
    await user.type(
      screen.getByLabelText("Masalah utama"),
      "Sulit dapat lead berkualitas",
    );
    await user.type(
      screen.getByLabelText("Hasil yang ingin diberikan"),
      "Rencana 30 hari",
    );
    await user.type(screen.getByLabelText("Niche"), "B2B SaaS");

    await user.selectOptions(
      screen.getByLabelText("Tujuan Lead Magnet"),
      "collect_email",
    );
    await user.selectOptions(
      screen.getByLabelText("Aksi setelah membaca"),
      "visit_product",
    );
    await user.type(
      screen.getByLabelText("Tautan tujuan"),
      "https://example.com/x",
    );

    await user.click(screen.getByRole("button", { name: "Lanjutkan" }));
    expect(
      await screen.findByText("Format yang direkomendasikan"),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Lanjutkan" }));
    expect(await screen.findByText("Tinjau proyek")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Buat Proyek" }));

    await waitFor(() => {
      expect(mutateAsyncMock).toHaveBeenCalled();
    });
    const payload = mutateAsyncMock.mock.calls[0][0];
    expect(payload.version).toBe(2);
    expect(payload.ebook_type).toBe("lead_magnet");
    expect(payload.business_context.type).toBe("lead_magnet");
    expect(payload.common.topic).toContain("Lead Gen");
    expect(payload.business_context.cta_url).toBe("https://example.com/x");

    await waitFor(() => {
      expect(pushMock).toHaveBeenCalledWith(
        "/projects/proj-new-1?stage=strategy",
      );
    });
    expect(pushToastMock).toHaveBeenCalledWith(
      expect.objectContaining({ title: "Proyek berhasil dibuat" }),
    );
  });

  it("keeps form data on create failure", async () => {
    mutateAsyncMock.mockRejectedValueOnce(new Error("server boom"));
    const user = userEvent.setup();
    render(<NewProjectWizard />);

    await user.click(screen.getByRole("button", { name: "Lanjutkan" }));
    await user.type(screen.getByLabelText("Topik utama"), "Topik gagal");
    await user.type(screen.getByLabelText("Target pembaca"), "Audiens");
    await user.type(screen.getByLabelText("Masalah utama"), "Masalah");
    await user.type(
      screen.getByLabelText("Hasil yang ingin diberikan"),
      "Hasil",
    );
    await user.type(screen.getByLabelText("Niche"), "Niche");
    await user.selectOptions(
      screen.getByLabelText("Tujuan Lead Magnet"),
      "collect_email",
    );
    await user.selectOptions(
      screen.getByLabelText("Aksi setelah membaca"),
      "custom",
    );
    await user.click(screen.getByRole("button", { name: "Lanjutkan" }));
    await user.click(screen.getByRole("button", { name: "Lanjutkan" }));
    await user.click(screen.getByRole("button", { name: "Buat Proyek" }));

    await waitFor(() => {
      expect(screen.getAllByText(/server boom|Gagal/i).length).toBeGreaterThan(
        0,
      );
    });
    expect(pushMock).not.toHaveBeenCalled();
    // Still on review
    expect(screen.getByText("Tinjau proyek")).toBeInTheDocument();
  });
});
