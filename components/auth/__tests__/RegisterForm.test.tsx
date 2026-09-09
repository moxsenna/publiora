// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { RegisterForm } from "../RegisterForm";
import { useAuthStore } from "@/store/authStore";

const replace = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace }) }));
afterEach(cleanup);
beforeEach(() => replace.mockReset());

async function fillForm() {
  await userEvent.type(screen.getByLabelText("Nama"), "Nara Pustaka");
  await userEvent.type(screen.getByLabelText("Email"), "nara@contoh.id");
  await userEvent.type(screen.getByLabelText("Kata sandi"), "rahasia123");
}

describe("RegisterForm", () => {
  it("focuses and links first invalid control", async () => {
    render(<RegisterForm />);
    await userEvent.click(screen.getByRole("button", { name: "Daftar" }));
    const name = screen.getByLabelText("Nama");
    expect(name).toHaveFocus();
    expect(name).toHaveAttribute("aria-describedby", "name-error");
    expect(name).toHaveAttribute("aria-invalid", "true");
  });

  it("shows friendly email confirmation card when email confirmation is required", async () => {
    const signUp = vi.fn().mockResolvedValue({ confirmationRequired: true });
    useAuthStore.setState({ signUp });
    render(<RegisterForm />);
    await fillForm();
    await userEvent.click(screen.getByRole("button", { name: "Daftar" }));
    const status = await screen.findByRole("status");
    expect(status).toHaveAttribute("tabindex", "-1");
    await waitFor(() => expect(status).toHaveFocus());
    expect(screen.getByRole("heading", { name: "Periksa Email Anda" })).toBeInTheDocument();
    expect(screen.getByText("nara@contoh.id")).toBeInTheDocument();
    expect(screen.getByText(/Tautan konfirmasi telah dikirim ke/i)).toBeInTheDocument();
    expect(screen.queryByLabelText("Nama")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Email")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Kata sandi")).not.toBeInTheDocument();
    const backLink = screen.getByRole("link", { name: "Kembali ke halaman Masuk" });
    expect(backLink).toBeInTheDocument();
    expect(backLink).toHaveAttribute("href", "/login");
    expect(replace).not.toHaveBeenCalled();
  });

  it("shows confirmation flow without redirecting when confirmation error is thrown", async () => {
    useAuthStore.setState({
      signUp: vi.fn().mockRejectedValue(new Error("Akun dibuat. Cek email untuk konfirmasi, lalu login.")),
    });
    render(<RegisterForm returnTo="/claim/CLAIM123" />);
    await fillForm();
    await userEvent.click(screen.getByRole("button", { name: "Daftar" }));
    const status = await screen.findByRole("status");
    expect(status).toHaveAttribute("tabindex", "-1");
    await waitFor(() => expect(status).toHaveFocus());
    expect(screen.getByRole("heading", { name: "Periksa Email Anda" })).toBeInTheDocument();
    expect(screen.getByText("nara@contoh.id")).toBeInTheDocument();
    expect(screen.queryByLabelText("Nama")).not.toBeInTheDocument();
    const backLink = screen.getByRole("link", { name: "Kembali ke halaman Masuk" });
    expect(backLink).toHaveAttribute("href", "/login?return_to=%2Fclaim%2FCLAIM123");
    expect(replace).not.toHaveBeenCalled();
  });

  it("maps unknown backend details to generic actionable copy", async () => {
    useAuthStore.setState({ signUp: vi.fn().mockRejectedValue(new Error("database constraint users_email_key")) });
    render(<RegisterForm />);
    await fillForm();
    await userEvent.click(screen.getByRole("button", { name: "Daftar" }));
    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("Akun belum dapat dibuat. Coba lagi beberapa saat lagi.");
    expect(alert).toHaveAttribute("tabindex", "-1");
    await waitFor(() => expect(alert).toHaveFocus());
    expect(screen.queryByText(/constraint users_email_key/i)).not.toBeInTheDocument();
  });

  it("preserves sign-up signature and successful redirect", async () => {
    const signUp = vi.fn().mockResolvedValue({});
    useAuthStore.setState({ signUp });
    render(<RegisterForm />);
    await fillForm();
    await userEvent.click(screen.getByRole("button", { name: "Daftar" }));
    await waitFor(() => expect(signUp).toHaveBeenCalledWith("Nara Pustaka", "nara@contoh.id", "rahasia123", false));
    expect(replace).toHaveBeenCalledWith("/dashboard");
  });

  it("redirects to the validated claim return path", async () => {
    const signUp = vi.fn().mockResolvedValue({});
    useAuthStore.setState({ signUp });
    render(<RegisterForm returnTo="/claim/ABC123" />);
    await fillForm();
    await userEvent.click(screen.getByRole("button", { name: "Daftar" }));
    await waitFor(() => expect(signUp).toHaveBeenCalledWith("Nara Pustaka", "nara@contoh.id", "rahasia123", false));
    expect(replace).toHaveBeenCalledWith("/claim/ABC123");
  });

  it("keeps the marketing consent checkbox unchecked by default", async () => {
    const signUp = vi.fn().mockResolvedValue({});
    useAuthStore.setState({ signUp });
    render(<RegisterForm />);
    const consent = screen.getByLabelText(/menerima tips membuat ebook/i) as HTMLInputElement;
    expect(consent).not.toBeChecked();
    await fillForm();
    await userEvent.click(screen.getByRole("button", { name: "Daftar" }));
    await waitFor(() => expect(signUp).toHaveBeenCalledWith("Nara Pustaka", "nara@contoh.id", "rahasia123", false));
  });

  it("passes consent when the marketing checkbox is checked", async () => {
    const signUp = vi.fn().mockResolvedValue({});
    useAuthStore.setState({ signUp });
    render(<RegisterForm />);
    await userEvent.click(screen.getByLabelText(/menerima tips membuat ebook/i));
    await fillForm();
    await userEvent.click(screen.getByRole("button", { name: "Daftar" }));
    await waitFor(() => expect(signUp).toHaveBeenCalledWith("Nara Pustaka", "nara@contoh.id", "rahasia123", true));
    expect(replace).toHaveBeenCalledWith("/dashboard");
  });
});
