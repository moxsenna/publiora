// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { LoginForm } from "../LoginForm";
import { useAuthStore } from "@/store/authStore";

const replace = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace }) }));
vi.mock("next/link", () => ({ default: ({ href, children, ...props }: any) => <a href={href} {...props}>{children}</a> }));

afterEach(cleanup);
beforeEach(() => { replace.mockReset(); });

describe("LoginForm", () => {
  it("links validation errors and focuses first invalid control", async () => {
    render(<LoginForm />);
    await userEvent.click(screen.getByRole("button", { name: "Masuk" }));
    const email = screen.getByLabelText("Email");
    expect(email).toHaveFocus();
    expect(email).toHaveAttribute("aria-invalid", "true");
    expect(email).toHaveAttribute("aria-describedby", "email-error");
    expect(screen.getByText("Format email tidak valid")).toHaveAttribute("id", "email-error");
  });

  it("maps provider failures to safe Indonesian form errors", async () => {
    useAuthStore.setState({ signIn: vi.fn().mockRejectedValue(new Error("Invalid login credentials")) });
    render(<LoginForm />);
    await userEvent.type(screen.getByLabelText("Email"), "nama@contoh.id");
    await userEvent.type(screen.getByLabelText("Kata sandi"), "rahasia");
    await userEvent.click(screen.getByRole("button", { name: "Masuk" }));
    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("Email atau kata sandi salah.");
    expect(alert).toHaveAttribute("tabindex", "-1");
    await waitFor(() => expect(alert).toHaveFocus());
    expect(screen.queryByText("Invalid login credentials")).not.toBeInTheDocument();
  });

  it("preserves sign-in signature and successful redirect", async () => {
    const signIn = vi.fn().mockResolvedValue({});
    useAuthStore.setState({ signIn });
    render(<LoginForm />);
    await userEvent.type(screen.getByLabelText("Email"), "nama@contoh.id");
    await userEvent.type(screen.getByLabelText("Kata sandi"), "rahasia");
    await userEvent.click(screen.getByRole("button", { name: "Masuk" }));
    await waitFor(() => expect(signIn).toHaveBeenCalledWith("nama@contoh.id", "rahasia"));
    expect(replace).toHaveBeenCalledWith("/dashboard");
  });

  it("redirects to the validated claim return path", async () => {
    const signIn = vi.fn().mockResolvedValue({});
    useAuthStore.setState({ signIn });
    render(<LoginForm returnTo="/claim/ABC123" />);
    await userEvent.type(screen.getByLabelText("Email"), "nama@contoh.id");
    await userEvent.type(screen.getByLabelText("Kata sandi"), "rahasia");
    await userEvent.click(screen.getByRole("button", { name: "Masuk" }));
    await waitFor(() => expect(signIn).toHaveBeenCalledWith("nama@contoh.id", "rahasia"));
    expect(replace).toHaveBeenCalledWith("/claim/ABC123");
  });

  it("renders friendly alert banner when auth callback fails", () => {
    render(<LoginForm callbackError="auth_callback_failed" />);
    const alert = screen.getByRole("alert");
    expect(alert).toHaveTextContent("Tautan verifikasi tidak valid atau telah kedaluwarsa.");
  });
});
