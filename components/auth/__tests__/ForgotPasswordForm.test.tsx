// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ForgotPasswordForm } from "../ForgotPasswordForm";

const resetPasswordForEmail = vi.fn();
vi.mock("@/lib/supabase/client", () => ({
  hasSupabaseEnv: () => true,
  createClient: () => ({ auth: { resetPasswordForEmail } }),
}));

afterEach(cleanup);
beforeEach(() => { resetPasswordForEmail.mockReset(); window.history.replaceState({}, "", "/forgot-password"); });

describe("ForgotPasswordForm", () => {
  it("validates, links, and focuses email", async () => {
    render(<ForgotPasswordForm />);
    await userEvent.click(screen.getByRole("button", { name: "Kirim tautan pengaturan ulang" }));
    const email = screen.getByLabelText("Email");
    expect(email).toHaveFocus();
    expect(email).toHaveAttribute("aria-invalid", "true");
    expect(email).toHaveAttribute("aria-describedby", "forgot-email-error");
  });

  it("uses login reset URL and always gives enumeration-safe success", async () => {
    resetPasswordForEmail.mockResolvedValue({ error: { message: "User not found" } });
    render(<ForgotPasswordForm />);
    await userEvent.type(screen.getByLabelText("Email"), "tidakada@contoh.id");
    await userEvent.click(screen.getByRole("button", { name: "Kirim tautan pengaturan ulang" }));
    await waitFor(() => expect(resetPasswordForEmail).toHaveBeenCalledWith("tidakada@contoh.id", { redirectTo: `${window.location.origin}/login` }));
    expect(await screen.findByRole("status")).toHaveTextContent("Jika alamat tersebut terdaftar, petunjuk pengaturan ulang sudah dikirim melalui email.");
    expect(screen.queryByText("User not found")).not.toBeInTheDocument();
  });
});
