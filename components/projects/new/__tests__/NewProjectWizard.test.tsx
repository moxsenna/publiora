// @vitest-environment jsdom

import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom/vitest";
import * as React from "react";

const pushMock = vi.fn();
const mutateAsyncMock = vi.fn();
const pushToastMock = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock }),
  useSearchParams: () => new URLSearchParams(),
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
  useOffer: () => ({ data: undefined, isLoading: false }),
  useOffers: () => ({ data: { items: [], next_cursor: null }, isLoading: false }),
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
