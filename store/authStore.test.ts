// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";

const { signInWithPassword, signUp, getProfile } = vi.hoisted(() => ({
  signInWithPassword: vi.fn(),
  signUp: vi.fn(),
  getProfile: vi.fn(),
}));

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    auth: {
      signInWithPassword,
      signUp,
      signOut: vi.fn().mockResolvedValue({ error: null }),
      getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: vi.fn() } } }),
    },
    from: () => ({
      select: () => ({ eq: () => ({ maybeSingle: getProfile }) }),
    }),
  }),
  hasSupabaseEnv: () => true,
}));

import { useAuthStore } from "@/store/authStore";

const RAW_PROFILE = {
  id: "u1",
  email: "nara@contoh.id",
  name: "Nara",
  plan: "free",
  signup_origin: "claim_link",
};

const fetchMock = vi.fn();
beforeEach(() => {
  vi.clearAllMocks();
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
  window.localStorage.clear();
});

describe("authStore signup context completion", () => {
  it("completes the context with consent from the register form", async () => {
    signInWithPassword.mockResolvedValue({ error: null });
    signUp.mockResolvedValue({
      data: { user: { id: "u1", email: "nara@contoh.id" }, session: {} },
      error: null,
    });
    getProfile.mockResolvedValue({ data: PROFILE_ROW(), error: null });
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ profile: {} }), { status: 200 }));

    const profile = await useAuthStore.getState().signUp("Nara", "nara@contoh.id", "rahasia123", true);

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/auth/complete-signup-context",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ marketing_email_consent: true }),
        credentials: "same-origin",
      })
    );
    expect(profile).toBeTruthy();
  });

  it("signs in with unchecked consent when no pending consent exists", async () => {
    signInWithPassword.mockResolvedValue({
      data: { user: { id: "u1", email: "nara@contoh.id" } },
      error: null,
    });
    getProfile.mockResolvedValue({ data: PROFILE_ROW(), error: null });
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ profile: {} }), { status: 200 }));

    await useAuthStore.getState().signIn("nara@contoh.id", "rahasia123");

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/auth/complete-signup-context",
      expect.objectContaining({ body: JSON.stringify({ marketing_email_consent: false }) })
    );
  });

  it("carries pending registration consent into the first login", async () => {
    signUp.mockResolvedValue({
      data: { user: { id: "u1" }, session: null },
      error: null,
    });

    // Email-confirm path: signUp throws with no session, stashing consent.
    await expect(
      useAuthStore.getState().signUp("Nara", "nara@contoh.id", "rahasia123", true)
    ).rejects.toThrow("Akun dibuat. Cek email untuk konfirmasi, lalu login.");
    expect(window.localStorage.getItem("publiora_pending_marketing_consent")).toBe("1");

    // The user confirms by email and signs in — consent is picked up.
    signInWithPassword.mockResolvedValue({
      data: { user: { id: "u1", email: "nara@contoh.id" } },
      error: null,
    });
    getProfile.mockResolvedValue({ data: PROFILE_ROW(), error: null });
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ profile: {} }), { status: 200 }));

    await useAuthStore.getState().signIn("nara@contoh.id", "rahasia123");

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/auth/complete-signup-context",
      expect.objectContaining({ body: JSON.stringify({ marketing_email_consent: true }) })
    );
    expect(window.localStorage.getItem("publiora_pending_marketing_consent")).toBeNull();
  });

  it("does not fail the sign-in when completion fails", async () => {
    signInWithPassword.mockResolvedValue({
      data: { user: { id: "u1", email: "nara@contoh.id" } },
      error: null,
    });
    getProfile.mockResolvedValue({ data: PROFILE_ROW(), error: null });
    fetchMock.mockRejectedValue(new Error("network down"));

    const profile = await useAuthStore.getState().signIn("nara@contoh.id", "rahasia123");
    expect(profile.email).toBe("nara@contoh.id");
  });
});

function PROFILE_ROW(): Record<string, unknown> {
  return { ...RAW_PROFILE };
}