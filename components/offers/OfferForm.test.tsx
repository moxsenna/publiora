// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom/vitest";
import { describe, expect, it, vi } from "vitest";
import { OfferForm } from "./OfferForm";

describe("OfferForm", () => {
  it("preserves data and hides raw backend errors", async () => {
    const user = userEvent.setup();
    render(<OfferForm onSubmit={vi.fn().mockRejectedValue(new Error("duplicate key value violates unique constraint offers_pkey"))} />);
    await user.type(screen.getByLabelText("Nama produk"), "Kelas Fokus");
    await user.click(screen.getByRole("button", { name: "Simpan" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Produk belum dapat disimpan. Periksa data Anda lalu coba lagi.");
    expect(screen.queryByText(/duplicate key/i)).not.toBeInTheDocument();
    expect(screen.getByLabelText("Nama produk")).toHaveValue("Kelas Fokus");
  });

  it("links validation errors and focuses first invalid field", async () => {
    const user = userEvent.setup();
    render(<OfferForm onSubmit={vi.fn()} />);
    await user.click(screen.getByRole("button", { name: "Simpan" }));
    const name = screen.getByLabelText("Nama produk");
    expect(name).toHaveFocus();
    expect(name).toHaveAttribute("aria-invalid", "true");
    expect(name).toHaveAttribute("aria-describedby", "offer-name-err");
  });
});
