// @vitest-environment jsdom
import * as React from "react";
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useAuthStore } from "@/store/authStore";

const mutateAsync = vi.fn(); const push = vi.fn(); const pushToast = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));
vi.mock("next/link", () => ({ default: ({ children, href, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) => <a href={href} {...props}>{children}</a> }));
vi.mock("@/lib/api/hooks", () => ({ READER_ID: "reader", useResolveClaim: () => ({ mutateAsync, isPending: false }) }));
vi.mock("@/store/projectStore", () => ({ useUiStore: (selector: (s: { pushToast: typeof pushToast }) => unknown) => selector({ pushToast }) }));
import { ClaimPage } from "../ClaimPage";

const ebook = { id:"e",project_id:"p",slug:"buku",title:"Buku",author:"Ayu",subtitle:null,cover_color:"#123",sections:[],published_at:"2026",total_readers:0,active_claims:0,is_public:true,cta_goal:null,final_cta:null,cta_url:null };

beforeEach(() => { mutateAsync.mockReset(); push.mockReset(); pushToast.mockReset(); useAuthStore.setState({ initialized: true, profile: null, signIn: vi.fn() }); });
afterEach(cleanup);

describe("ClaimPage", () => {
  it("uses semantic validated form, focuses first invalid field, and shows safe inline error", async () => {
    const user = userEvent.setup(); render(<ClaimPage token="secret" preview={{ status: "ready", ebook }} />);
    await user.click(screen.getByRole("button", { name: "Masuk & klaim" }));
    expect(screen.getByLabelText("Email")).toHaveFocus();
    expect(screen.getByText("Masukkan alamat email yang valid.")).toBeInTheDocument();
    expect(mutateAsync).not.toHaveBeenCalled();
  });

  it("authenticates before claim and redirects only for claimed ownership results", async () => {
    const signIn = vi.fn().mockResolvedValue({ email: "a@example.com" });
    useAuthStore.setState({ signIn }); mutateAsync.mockResolvedValue({ status: "expired" });
    const user = userEvent.setup(); render(<ClaimPage token="secret" preview={{ status: "ready", ebook }} />);
    await user.type(screen.getByLabelText("Email"), "a@example.com"); await user.type(screen.getByLabelText("Kata sandi"), "rahasia1");
    await user.click(screen.getByRole("button", { name: "Masuk & klaim" }));
    await waitFor(() => expect(signIn).toHaveBeenCalled());
    expect(mutateAsync).toHaveBeenCalledWith({ token: "secret", reader_id: "a@example.com" });
    expect(push).not.toHaveBeenCalled();
    expect(JSON.stringify(pushToast.mock.calls)).not.toContain("expired");
  });
});
