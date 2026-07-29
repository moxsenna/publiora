// @vitest-environment jsdom

import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom/vitest";
import * as React from "react";
import type { Offer } from "@/types/offer";

const pushMock = vi.fn();
const mutateAsyncMock = vi.fn();
const pushToastMock = vi.fn();
let mockSearchParams = new URLSearchParams();
let mockOfferData: { offer: ReturnType<typeof makeOffer> } | undefined;
let mockOffers: ReturnType<typeof makeOffer>[] = [];

function makeOffer(overrides: Partial<Offer> = {}): Offer {
  return {
    id: "offer-a",
    owner_id: "u1",
    name: "Growth Audit",
    offer_type: "service" as const,
    ownership: "owned" as const,
    status: "active" as const,
    short_description: "Audit",
    target_audience: "Founder SaaS",
    primary_problem: "Growth stuck",
    primary_outcome: "Find bottlenecks",
    niche: "SaaS",
    destination_url: "https://example.com",
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock }),
  useSearchParams: () => mockSearchParams,
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
  useOffer: () => ({ data: mockOfferData, isLoading: false }),
  useOffers: () => ({ data: { items: mockOffers, next_cursor: null }, isLoading: false }),
  useCreateOffer: () => ({ mutateAsync: vi.fn(), isPending: false }),
}));

vi.mock("@/store/projectStore", () => ({
  useUiStore: (selector?: (s: { pushToast: typeof pushToastMock }) => unknown) => {
    const state = { pushToast: pushToastMock };
    return selector ? selector(state) : state;
  },
}));

import { NewProjectWizard } from "@/components/projects/new/NewProjectWizard";
import { toCreateProjectV3 } from "@/components/projects/new/wizard-types";

describe("NewProjectWizard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSearchParams = new URLSearchParams();
    mockOfferData = undefined;
    mockOffers = [];
    mutateAsyncMock.mockResolvedValue({ id: "proj-new-1" });
  });

  it("renders three-step Indonesian shell", async () => {
    render(<NewProjectWizard />);
    expect(
      screen.getByRole("heading", { name: "Buat Proyek Baru" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Apa yang ingin Anda buat?")).toBeInTheDocument();
    expect(screen.getByText("Bonus Pembelian")).toBeInTheDocument();
    expect(screen.getByText("Ebook Berbayar")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Lanjutkan" })).toBeInTheDocument();
    expect(screen.getByText("Ide & Produk")).toBeInTheDocument();
  });

  it("advances from type step to ide & produk", async () => {
    const user = userEvent.setup();
    render(<NewProjectWizard />);
    await user.click(screen.getByRole("button", { name: "Lanjutkan" }));
    expect(await screen.findByText("Ide lead magnet")).toBeInTheDocument();
    expect(
      screen.getByText("Produk yang akan dipromosikan"),
    ).toBeInTheDocument();
  });

  it("shows Indonesian ebook label in summary and never raw enum", async () => {
    const user = userEvent.setup();
    render(<NewProjectWizard />);

    await user.click(screen.getByRole("button", { name: "Lanjutkan" }));
    await user.type(screen.getByLabelText("Ide lead magnet"), "Checklist akuisisi");
    await user.click(screen.getByRole("button", { name: /Belum ada produk/i }));
    await user.selectOptions(screen.getByLabelText("Tujuan Lead Magnet"), "collect_email");
    await user.click(screen.getByRole("button", { name: "Lanjutkan" }));

    expect(
      await screen.findByRole("heading", { name: "Tinjau proyek" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Lead Magnet")).toBeInTheDocument();
    expect(screen.queryByText(/lead_magnet/)).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^Tanpa template/ })).toBeInTheDocument();
  });

  it("shows safe actionable error instead of backend message", async () => {
    const user = userEvent.setup();
    mutateAsyncMock.mockRejectedValueOnce(new Error("duplicate key value violates unique constraint projects_pkey"));
    render(<NewProjectWizard />);

    await user.click(screen.getByRole("button", { name: "Lanjutkan" }));
    await user.type(screen.getByLabelText("Ide lead magnet"), "Checklist akuisisi");
    await user.click(screen.getByRole("button", { name: /Belum ada produk/i }));
    await user.selectOptions(screen.getByLabelText("Tujuan Lead Magnet"), "collect_email");
    await user.click(screen.getByRole("button", { name: "Lanjutkan" }));
    await user.click(screen.getByRole("button", { name: "Buat Proyek" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Proyek belum dapat dibuat. Periksa data Anda lalu coba lagi.");
    expect(screen.queryByText(/duplicate key/i)).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Kembali" }));
    expect(screen.getByLabelText("Ide lead magnet")).toHaveValue("Checklist akuisisi");
  });

  it("focuses validation summary and links field error accessibly", async () => {
    const user = userEvent.setup();
    render(<NewProjectWizard />);
    await user.click(screen.getByRole("button", { name: "Lanjutkan" }));
    await user.click(screen.getByRole("button", { name: "Lanjutkan" }));

    const summary = await screen.findByRole("alert");
    expect(summary).toHaveFocus();
    const idea = screen.getByLabelText("Ide lead magnet");
    expect(idea).toHaveAttribute("aria-invalid", "true");
    expect(idea).toHaveAttribute("aria-describedby", expect.stringContaining("error"));
  });

  it("keeps delayed locked preset from overwriting user edits", async () => {
    const user = userEvent.setup();
    mockSearchParams = new URLSearchParams("offer_id=offer-a&ebook_type=lead_magnet");
    const view = render(<NewProjectWizard />);

    await user.click(screen.getByRole("button", { name: "Lanjutkan" }));
    await user.type(screen.getByLabelText("Target pembaca (opsional)"), "Audiens manual");

    mockOfferData = { offer: makeOffer() };
    view.rerender(<NewProjectWizard />);

    expect(await screen.findByText("Growth Audit")).toBeInTheDocument();
    expect(screen.getByLabelText("Target pembaca (opsional)")).toHaveValue(
      "Audiens manual",
    );
    expect(screen.getByRole("button", { name: "Ganti" })).toBeInTheDocument();
  });

  it("switches directly with only a locked preset and reapplies the offer", async () => {
    const user = userEvent.setup();
    mockSearchParams = new URLSearchParams("offer_id=offer-a&ebook_type=lead_magnet");
    mockOfferData = { offer: makeOffer() };
    render(<NewProjectWizard />);
    await user.click(screen.getByRole("button", { name: "Lanjutkan" }));
    expect(await screen.findByText("Growth Audit")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Kembali" }));

    await user.click(screen.getByRole("button", { name: /Bonus Pembelian/ }));

    expect(screen.queryByRole("heading", { name: "Ganti tipe ebook?" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Bonus Pembelian/ })).toHaveAttribute("aria-pressed", "true");
    await user.click(screen.getByRole("button", { name: "Lanjutkan" }));
    expect(await screen.findByText("Growth Audit")).toBeInTheDocument();
    expect(screen.getByLabelText("Target pembaca (opsional)")).toHaveValue("Founder SaaS");
  });

  it("requires confirmation when genuine type-specific user data exists", async () => {
    const user = userEvent.setup();
    mockSearchParams = new URLSearchParams("offer_id=offer-a&ebook_type=lead_magnet");
    mockOfferData = { offer: makeOffer() };
    render(<NewProjectWizard />);
    await user.click(screen.getByRole("button", { name: "Lanjutkan" }));
    await user.selectOptions(screen.getByLabelText("Tujuan Lead Magnet"), "collect_email");
    await user.click(screen.getByRole("button", { name: "Kembali" }));

    await user.click(screen.getByRole("button", { name: /Bonus Pembelian/ }));
    expect(await screen.findByRole("heading", { name: "Ganti tipe ebook?" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Lead Magnet/ })).toHaveAttribute("aria-pressed", "true");

    await user.click(screen.getByRole("button", { name: "Ganti tipe" }));
    expect(screen.queryByRole("heading", { name: "Ganti tipe ebook?" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Bonus Pembelian/ })).toHaveAttribute("aria-pressed", "true");
  });

  it("preserves edited CTA URL when replacing and detaching offers", async () => {
    const user = userEvent.setup();
    const offerA = makeOffer();
    const offerB = makeOffer({
      id: "offer-b",
      name: "Scale Audit",
      destination_url: "https://offer-b.example.com",
    });
    mockOffers = [offerA, offerB];
    render(<NewProjectWizard />);
    await user.click(screen.getByRole("button", { name: "Lanjutkan" }));
    await user.selectOptions(screen.getByLabelText("Aksi setelah membaca (opsional)"), "visit_product");
    await user.click(screen.getByRole("button", { name: "Pilih produk atau penawaran" }));
    await user.click(await screen.findByRole("option", { name: /Growth Audit/ }));

    const ctaUrl = await screen.findByLabelText("URL tujuan");
    expect(ctaUrl).toHaveValue("https://example.com");
    await user.clear(ctaUrl);
    await user.type(ctaUrl, "https://custom.example.com");
    await user.click(screen.getByRole("button", { name: "Ganti" }));
    expect(screen.getByLabelText("URL tujuan")).toHaveValue("https://custom.example.com");
    await user.click(await screen.findByRole("option", { name: /Scale Audit/ }));
    expect(screen.getByLabelText("URL tujuan")).toHaveValue("https://custom.example.com");

    await user.click(screen.getByRole("button", { name: "Ganti" }));
    expect(screen.getByLabelText("URL tujuan")).toHaveValue("https://custom.example.com");
  });

  it("builds V3 lead payload without offer", () => {
    const payload = toCreateProjectV3({
      ebook_type: "lead_magnet",
      template_id: null,
      idea_text: "Lead Gen B2B",
      topic: "",
      audience: "",
      primary_problem: "",
      desired_outcome: "",
      niche: "",
      tone: "",
      working_title: "",
      author: "Creator",
      additional_notes: "",
      offer_mode: "none",
      selected_offer_id: null,
      no_offer: true,
      lead_goal: "collect_email",
      traffic_source: "",
      next_offer: "",
      post_read_action: undefined,
      cta_url: "",
      parent_product: "",
      bonus_role: undefined,
      bonus_intent: "",
      usage_moment: "",
      sellable_mode: undefined,
      sales_positioning: undefined,
      buyer_objections_text: "",
    });
    expect(payload.version).toBe(3);
    expect(payload.ebook_type).toBe("lead_magnet");
    expect(payload.offer_context.mode).toBe("none");
    expect(payload.business_context).toMatchObject({
      type: "lead_magnet",
      lead_goal: "collect_email",
    });
  });
});
