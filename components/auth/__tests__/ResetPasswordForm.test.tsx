// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ResetPasswordForm } from "../ResetPasswordForm";
import { authId } from "@/lib/i18n/id/auth";
import { useUiStore } from "@/store/projectStore";

const replace = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace }) }));
vi.mock("next/link", () => ({
  default: ({ href, children, ...props }: any) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

const mockUpdateUser = vi.fn();
const mockGetSession = vi.fn();
const mockHasSupabaseEnv = vi.fn(() => true);

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    auth: {
      updateUser: mockUpdateUser,
      getSession: mockGetSession,
    },
  }),
  hasSupabaseEnv: () => mockHasSupabaseEnv(),
}));

afterEach(cleanup);
beforeEach(() => {
  vi.clearAllMocks();
  mockHasSupabaseEnv.mockReturnValue(true);
  mockGetSession.mockResolvedValue({
    data: { session: { user: { id: "user-123" } } },
    error: null,
  });
  mockUpdateUser.mockResolvedValue({ data: {}, error: null });
});

describe("ResetPasswordForm", () => {
  it("validates min 8 characters and matching passwords", async () => {
    render(<ResetPasswordForm />);

    await waitFor(() => {
      expect(screen.getByLabelText(/kata sandi baru/i)).toBeInTheDocument();
    });

    const submitBtn = screen.getByRole("button", { name: /simpan kata sandi/i });

    // Submit with short password
    await userEvent.type(screen.getByLabelText(/kata sandi baru/i), "short");
    await userEvent.type(screen.getByLabelText(/ulangi kata sandi/i), "short");
    await userEvent.click(submitBtn);

    expect(await screen.findByText(/kata sandi minimal 8 karakter/i)).toBeInTheDocument();
    expect(mockUpdateUser).not.toHaveBeenCalled();

    // Mismatched passwords
    await userEvent.clear(screen.getByLabelText(/kata sandi baru/i));
    await userEvent.clear(screen.getByLabelText(/ulangi kata sandi/i));
    await userEvent.type(screen.getByLabelText(/kata sandi baru/i), "password123");
    await userEvent.type(screen.getByLabelText(/ulangi kata sandi/i), "different123");
    await userEvent.click(submitBtn);

    expect(await screen.findByText(/konfirmasi kata sandi tidak cocok/i)).toBeInTheDocument();
    expect(mockUpdateUser).not.toHaveBeenCalled();
  });

  it("submits new password, shows toast, and redirects to dashboard", async () => {
    const pushToast = vi.fn();
    useUiStore.setState({ pushToast });

    render(<ResetPasswordForm />);

    await waitFor(() => {
      expect(screen.getByLabelText(/kata sandi baru/i)).toBeInTheDocument();
    });

    await userEvent.type(screen.getByLabelText(/kata sandi baru/i), "passwordBaru123");
    await userEvent.type(screen.getByLabelText(/ulangi kata sandi/i), "passwordBaru123");
    await userEvent.click(screen.getByRole("button", { name: /simpan kata sandi/i }));

    await waitFor(() => {
      expect(mockUpdateUser).toHaveBeenCalledWith({ password: "passwordBaru123" });
    });

    expect(pushToast).toHaveBeenCalledWith(
      expect.objectContaining({
        title: authId.resetPasswordSuccess,
        variant: "success",
      })
    );
    expect(replace).toHaveBeenCalledWith("/dashboard");
  });

  it("redirects to custom returnTo on success if provided", async () => {
    render(<ResetPasswordForm returnTo="/settings" />);

    await waitFor(() => {
      expect(screen.getByLabelText(/kata sandi baru/i)).toBeInTheDocument();
    });

    await userEvent.type(screen.getByLabelText(/kata sandi baru/i), "passwordBaru123");
    await userEvent.type(screen.getByLabelText(/ulangi kata sandi/i), "passwordBaru123");
    await userEvent.click(screen.getByRole("button", { name: /simpan kata sandi/i }));

    await waitFor(() => {
      expect(mockUpdateUser).toHaveBeenCalledWith({ password: "passwordBaru123" });
    });
    expect(replace).toHaveBeenCalledWith("/settings");
  });

  it("renders invalid/expired token warning with link to forgot-password if session missing", async () => {
    mockGetSession.mockResolvedValueOnce({
      data: { session: null },
      error: null,
    });

    render(<ResetPasswordForm />);

    const warning = await screen.findByRole("alert");
    expect(warning).toHaveTextContent(authId.resetTokenInvalid);

    const backLink = screen.getByRole("link", { name: authId.backToForgot });
    expect(backLink).toBeInTheDocument();
    expect(backLink).toHaveAttribute("href", "/forgot-password");

    expect(screen.queryByLabelText(/kata sandi baru/i)).not.toBeInTheDocument();
  });

  it("renders invalid token warning if getSession returns error", async () => {
    mockGetSession.mockResolvedValueOnce({
      data: { session: null },
      error: new Error("Invalid token"),
    });

    render(<ResetPasswordForm />);

    const warning = await screen.findByRole("alert");
    expect(warning).toHaveTextContent(authId.resetTokenInvalid);
  });

  it("handles update error properly and displays mapped error message", async () => {
    mockUpdateUser.mockResolvedValueOnce({
      data: {},
      error: { message: "Password should be different from the old password." },
    });

    render(<ResetPasswordForm />);

    await waitFor(() => {
      expect(screen.getByLabelText(/kata sandi baru/i)).toBeInTheDocument();
    });

    await userEvent.type(screen.getByLabelText(/kata sandi baru/i), "passwordBaru123");
    await userEvent.type(screen.getByLabelText(/ulangi kata sandi/i), "passwordBaru123");
    await userEvent.click(screen.getByRole("button", { name: /simpan kata sandi/i }));

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("Password should be different from the old password.");
    expect(replace).not.toHaveBeenCalled();
  });
});
