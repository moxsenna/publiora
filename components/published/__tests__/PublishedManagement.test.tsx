// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { act, cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { ClaimEvent, ClaimLink } from "@/types/claim-link";
import type { ExportJob } from "@/types/export";
import type { PublishedEbook } from "@/types/published-ebook";
import { buildPublicClaimUrl } from "@/lib/urls";
import {
  ClaimEventsTable,
  ClaimLinkRow,
  CreateClaimLinkDialog,
  ExportsPanel,
  PublicationInfoPanel,
  PublishedHeader,
} from "@/components/published";

vi.mock("next/link", () => ({
  default: ({ children, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement>) => <a {...props}>{children}</a>,
}));

afterEach(cleanup);

const ebook: PublishedEbook = {
  id: "ebook-1",
  project_id: "project-1",
  slug: "panduan-panjang",
  title: "Panduan Publikasi",
  author: "Ayu",
  subtitle: "Untuk kreator",
  cover_color: "#123456",
  sections: [{ id: "section-1", position: 1, title: "Awal", content_html: "<p>Isi</p>" }],
  published_at: "2026-07-01T12:34:56.000Z",
  total_readers: 12,
  active_claims: 3,
  is_public: true,
  cta_goal: null,
  final_cta: null,
  cta_url: null,
  offer_context: null,
};

const link: ClaimLink = {
  id: "link-1",
  ebook_id: ebook.id,
  token: "TOKEN-AUTHORITY-123",
  label: "Peluncuran",
  status: "active",
  max_uses: 20,
  used_count: 2,
  created_at: "2026-07-01T12:34:56.000Z",
  expires_at: "2026-08-01T12:34:56.000Z",
  revoked_at: null,
};

describe("komponen manajemen publikasi", () => {
  it("mempertahankan URL reader dan nama aksi header", () => {
    render(<PublishedHeader ebook={ebook} onCreateClaimLink={vi.fn()} />);
    expect(screen.getByRole("link", { name: "Buka reader" })).toHaveAttribute("href", "/read/panduan-panjang");
    expect(screen.getByRole("link", { name: "Buka reader" })).toHaveAttribute("rel", "noopener noreferrer");
    expect(screen.getByRole("button", { name: "Buat tautan klaim" })).toBeInTheDocument();
    expect(screen.getByText("12 pembaca")).toBeInTheDocument();
  });

  it("mengonfirmasi pencabutan dengan label dan path objek, menunggu mutasi, dan mencegah aksi ganda", async () => {
    const user = userEvent.setup();
    let finish!: () => void;
    const onRevoke = vi.fn(() => new Promise<void>((resolve) => { finish = resolve; }));
    render(<ClaimLinkRow link={link} eventsPanel={<p>Event</p>} onRevoke={onRevoke} onDelete={vi.fn()} />);

    await user.click(screen.getByRole("button", { name: "Cabut tautan Peluncuran" }));
    expect(onRevoke).not.toHaveBeenCalled();
    const dialog = screen.getByRole("dialog", { name: "Cabut tautan klaim?" });
    expect(within(dialog).getByText("Peluncuran")).toBeInTheDocument();
    const claimPath = within(dialog).getByText("/claim/TOKEN-AUTHORITY-123");
    expect(claimPath).toHaveClass("break-all");
    await user.click(screen.getByRole("button", { name: "Ya, cabut tautan" }));
    expect(onRevoke).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("button", { name: "Ya, cabut tautan" })).toBeDisabled();
    await act(async () => finish());
  });

  it("mengonfirmasi penghapusan dengan label dan path objek", async () => {
    const user = userEvent.setup();
    render(<ClaimLinkRow link={link} eventsPanel={<p>Event</p>} onRevoke={vi.fn()} onDelete={vi.fn()} />);

    await user.click(screen.getByRole("button", { name: "Hapus tautan Peluncuran" }));
    const dialog = screen.getByRole("dialog", { name: "Hapus tautan klaim?" });
    expect(within(dialog).getByText("Peluncuran")).toBeInTheDocument();
    expect(within(dialog).getByText("/claim/TOKEN-AUTHORITY-123")).toHaveClass("break-all");
  });

  it("memberi kontrol terhubung untuk event dan URL klaim berbasis token", async () => {
    const user = userEvent.setup();
    render(<ClaimLinkRow link={link} eventsPanel={<p>Riwayat klaim</p>} onRevoke={vi.fn()} onDelete={vi.fn()} />);
    const toggle = screen.getByRole("button", { name: "Tampilkan event Peluncuran" });
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    expect(toggle).toHaveAttribute("aria-controls");
    expect(screen.getByRole("link", { name: "Buka tautan klaim Peluncuran" })).toHaveAttribute("href", buildPublicClaimUrl(link.token));
    await user.click(toggle);
    expect(toggle).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByText("Riwayat klaim")).toBeInTheDocument();
  });

  it("menyalin URL klaim dari domain reader (bukan origin aplikasi)", async () => {
    const user = userEvent.setup();
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", { value: { writeText }, configurable: true });
    render(<ClaimLinkRow link={link} eventsPanel={null} onRevoke={vi.fn()} onDelete={vi.fn()} />);

    await user.click(screen.getByRole("button", { name: "Salin URL Peluncuran" }));

    expect(writeText).toHaveBeenCalledWith(buildPublicClaimUrl(link.token));
  });

  it("menampilkan tabel event dengan caption, scope, status mapper, dan tanggal Indonesia", () => {
    const events: ClaimEvent[] = [{
      id: "event-1", claim_link_id: link.id, reader_email: "reader@example.com",
      status: "already_owned", created_at: "2026-07-02T12:34:56.000Z",
    }];
    render(<ClaimEventsTable events={events} isLoading={false} isError={false} onRetry={vi.fn()} />);
    const table = screen.getByRole("table", { name: "Event klaim" });
    expect(within(table).getByText("Sudah dimiliki")).toBeInTheDocument();
    expect(within(table).getAllByRole("columnheader").every((cell) => cell.getAttribute("scope") === "col")).toBe(true);
  });

  it("memakai constraint native dan error field tanpa mengirim payload invalid", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<CreateClaimLinkDialog open onClose={vi.fn()} ebookId={ebook.id} isPending={false} onSubmit={onSubmit} />);
    const max = screen.getByRole("spinbutton", { name: "Batas penggunaan (opsional)" });
    expect(max).toHaveAttribute("min", "1");
    await user.type(screen.getByRole("textbox", { name: "Label" }), "Peluncuran");
    await user.type(max, "0");
    await user.click(screen.getByRole("button", { name: "Buat tautan" }));
    expect(await screen.findByText("Batas penggunaan minimal 1.")).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("mempertahankan semua nilai dan dialog ketika pembuatan gagal", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockResolvedValue(false);
    render(<CreateClaimLinkDialog open onClose={vi.fn()} ebookId={ebook.id} isPending={false} onSubmit={onSubmit} />);
    await user.type(screen.getByRole("textbox", { name: "Label" }), "Peluncuran gagal");
    await user.type(screen.getByRole("spinbutton", { name: "Batas penggunaan (opsional)" }), "20");
    await user.type(screen.getByRole("spinbutton", { name: "Masa berlaku dalam hari (opsional)" }), "30");
    await user.click(screen.getByRole("button", { name: "Buat tautan" }));
    await act(async () => {});
    expect(onSubmit).toHaveBeenCalledWith({ ebook_id: ebook.id, label: "Peluncuran gagal", max_uses: 20, expires_in_days: 30 });
    expect(screen.getByRole("dialog", { name: "Buat tautan klaim" })).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: "Label" })).toHaveValue("Peluncuran gagal");
    expect(screen.getByRole("spinbutton", { name: "Batas penggunaan (opsional)" })).toHaveValue(20);
    expect(screen.getByRole("spinbutton", { name: "Masa berlaku dalam hari (opsional)" })).toHaveValue(30);
  });

  it("menampilkan ekspor dan info dengan tabel responsif serta URL unduhan asli", () => {
    const jobs: ExportJob[] = [{
      id: "export-1", ebook_id: ebook.id, ebook_title: ebook.title, format: "pdf", status: "complete",
      url: "/download/original.pdf", created_at: "2026-07-01T12:34:56.000Z", completed_at: null, error: null,
    }];
    const { rerender } = render(<ExportsPanel exports={jobs} isLoading={false} isError={false} isCreating={false} onRetry={vi.fn()} onCreate={vi.fn()} />);
    expect(screen.getByRole("table", { name: "Riwayat ekspor" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Unduh PDF" })).toHaveAttribute("href", "/download/original.pdf");
    expect(screen.getByRole("link", { name: "Unduh PDF" })).toHaveAttribute("rel", "noopener noreferrer");
    rerender(<PublicationInfoPanel ebook={ebook} />);
    expect(screen.getByRole("table", { name: "Informasi publikasi" })).toBeInTheDocument();
    expect(screen.getByText("Publik")).toBeInTheDocument();
  });
});
