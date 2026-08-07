// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import * as React from "react";
import { ClaimPage } from "./ClaimPage";

vi.mock("next/navigation", () => ({ useRouter: () => ({ replace: vi.fn(), push: vi.fn() }) }));
vi.mock("next/link", () => ({ default: ({ href, children, ...props }: any) => <a href={href} {...props}>{children}</a> }));
vi.mock("@/lib/api/hooks", () => ({
  useResolveClaim: () => ({ mutateAsync: vi.fn().mockResolvedValue({ status: "claimed", ebook: { slug: "aman" } }), isPending: false }),
  READER_ID: "reader-id",
}));

import { useAuthStore } from "@/store/authStore";

afterEach(cleanup);

function readyPreview() {
  return {
    status: "ready" as const,
    ebook: {
      id: "ebook-1",
      project_id: "project-1",
      slug: "aman",
      title: "Aman",
      author: "Ayu",
      subtitle: null,
      cover_color: "#123456",
      sections: [],
      published_at: "2026-01-01",
      total_readers: 0,
      active_claims: 0,
      is_public: false,
      cta_goal: null,
      final_cta: null,
      cta_url: null,
    },
  };
}

describe("ClaimPage claim journey", () => {
  it("routes account creation through auth/start with the claim token", () => {
    useAuthStore.setState({ initialized: true, profile: null, signIn: vi.fn() });
    render(<ClaimPage token="ABC123" preview={readyPreview()} />);
    const signUp = screen.getByRole("link", { name: "Daftar untuk klaim" });
    expect(signUp).toHaveAttribute("href", "/auth/start?source=claim_link&claim_token=ABC123&return_to=%2Fclaim%2FABC123");
  });

  it("keeps the sign-in action inside the claim journey", () => {
    useAuthStore.setState({ initialized: true, profile: null, signIn: vi.fn() });
    render(<ClaimPage token="ABC123" preview={readyPreview()} />);
    const submit = screen.getByRole("button", { name: "Masuk & klaim" });
    expect(submit).toBeInTheDocument();
  });

  it("sign-in header preserves the claim return path", () => {
    useAuthStore.setState({ initialized: true, profile: null, signIn: vi.fn() });
    render(<ClaimPage token="ABC123" preview={readyPreview()} />);
    const login = screen.getByRole("link", { name: "Masuk" });
    expect(login).toHaveAttribute("href", "/login?return_to=%2Fclaim%2FABC123");
  });

  it("an existing reader sees the add-to-library action, not the auth form", () => {
    useAuthStore.setState({
      initialized: true,
      profile: {
        id: "u1",
        email: "pembaca@cont.id",
        name: "Pembaca",
        avatar_url: null,
        role: "user",
        plan: "free",
        created_at: "2026-01-01",
        updated_at: "2026-01-01",
        signup_origin: "landing_page",
        initial_intent: null,
        first_claim_link_id: null,
        first_claim_ebook_id: null,
        first_claim_creator_id: null,
        reader_activated_at: null,
        creator_activated_at: null,
        creator_subscribed_at: null,
        marketing_email_consent: false,
        marketing_email_consent_at: null,
        marketing_email_consent_source: null,
      },
      signIn: vi.fn(),
    });
    render(<ClaimPage token="ABC123" preview={readyPreview()} />);
    expect(screen.getByRole("button", { name: "Tambahkan ke Pustaka" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Masuk & klaim" })).not.toBeInTheDocument();
  });
});