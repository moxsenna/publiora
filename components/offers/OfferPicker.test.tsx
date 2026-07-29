// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom/vitest";
import { describe, expect, it, vi } from "vitest";
import { OfferPicker } from "./OfferPicker";
import type { Offer } from "@/types/offer";

const offers = [
  { id: "one", name: "Produk Satu", offer_type: "service", ownership: "owned", status: "active" },
  { id: "two", name: "Produk Dua", offer_type: "course", ownership: "affiliate", status: "active" },
].map((offer) => ({
  owner_id: "owner", short_description: null, target_audience: null, primary_problem: null,
  primary_outcome: null, niche: null, destination_url: null, created_at: "2026-01-01", updated_at: "2026-01-01",
  linked_project_count: 0, ...offer,
})) as Offer[];

vi.mock("@/lib/api/hooks", () => ({
  useOffers: () => ({ data: { items: offers }, isLoading: false }),
  useCreateOffer: () => ({ mutateAsync: vi.fn(), isPending: false }),
}));

vi.mock("@/lib/hooks/useDebouncedValue", () => ({ useDebouncedValue: (value: string) => value }));

describe("OfferPicker", () => {
  it("keeps aria-selected on selected value while active descendant tracks highlight", async () => {
    const user = userEvent.setup();
    render(<OfferPicker value={null} onChange={vi.fn()} />);
    await user.click(screen.getByRole("button", { name: "Pilih produk atau penawaran" }));
    const combobox = screen.getByRole("combobox", { name: "Cari produk atau penawaran" });
    await user.keyboard("{ArrowDown}");
    expect(combobox).toHaveAttribute("aria-activedescendant", expect.stringContaining("two"));
    expect(screen.getByRole("option", { name: /Produk Satu/ })).toHaveAttribute("aria-selected", "false");
    expect(screen.getByRole("option", { name: /Produk Dua/ })).toHaveAttribute("aria-selected", "false");
  });
});
