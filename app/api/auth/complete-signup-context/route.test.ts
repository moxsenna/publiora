import { beforeEach, describe, expect, it, vi } from "vitest";
import { createHash } from "node:crypto";

const { createClient, resolveAuthCookieDomain } = vi.hoisted(() => ({
  createClient: vi.fn(),
  resolveAuthCookieDomain: vi.fn(() => null),
}));

vi.mock("@/lib/supabase/server", () => ({ createClient }));
vi.mock("@/lib/supabase/cookie-options", () => ({ resolveAuthCookieDomain }));

import { POST } from "./route";
import { SIGNUP_CONTEXT_COOKIE, hashSignupContextToken } from "@/lib/auth/signup-context";

const PROFILE_ROW = {
  id: "user-1",
  email: "pembaca@example.com",
  signup_origin: "claim_link",
  initial_intent: "reader",
};

function readyAuth(profile = PROFILE_ROW) {
  const rpc = vi.fn().mockResolvedValue({ data: profile, error: null });
  const supabase = {
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: "user-1" } } }) },
    rpc,
  };
  createClient.mockResolvedValue(supabase);
  return rpc;
}

function requestWithCookie(token: string | null, consent = false) {
  const headers: Record<string, string> = { "content-type": "application/json" };
  if (token) headers.cookie = `${SIGNUP_CONTEXT_COOKIE}=${encodeURIComponent(token)}`;
  return new Request("http://localhost/api/auth/complete-signup-context", {
    method: "POST",
    headers,
    body: JSON.stringify({ marketing_email_consent: consent }),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("complete-signup-context route", () => {
  it("hashes the cookie token and calls the RPC with the hash, not the raw value", async () => {
    const rpc = readyAuth();
    const rawToken = "raw-token-abc123";

    const response = await POST(requestWithCookie(rawToken, false));
    const body = await response.json();

    expect(rpc).toHaveBeenCalledWith("complete_signup_context_v1", {
      p_token_hash: hashSignupContextToken(rawToken),
      p_marketing_email_consent: false,
    });
    // The raw token never reaches the RPC payload nor the response body.
    expect(JSON.stringify(rpc.mock.calls)).not.toContain(rawToken);
    expect(body.profile.signup_origin).toBe("claim_link");
  });

  it("clears the context cookie after a successful completion", async () => {
    readyAuth();

    const response = await POST(requestWithCookie("raw-token-abc"));
    const setCookie = response.headers.get("set-cookie");

    expect(setCookie).toContain(`${SIGNUP_CONTEXT_COOKIE}=`);
    expect(setCookie).toContain("Max-Age=0");
  });

  it("is idempotent-safe: a missing cookie still completes with a null hash", async () => {
    const rpc = readyAuth({
      ...PROFILE_ROW,
      signup_origin: "direct_app",
      initial_intent: "creator",
    });

    const response = await POST(requestWithCookie(null));
    const body = await response.json();

    expect(rpc).toHaveBeenCalledWith("complete_signup_context_v1", {
      p_token_hash: null,
      p_marketing_email_consent: false,
    });
    expect(body.profile.signup_origin).toBe("direct_app");
  });

  it("passes an unchecked consent as false", async () => {
    const rpc = readyAuth();
    const req = new Request("http://localhost/api/auth/complete-signup-context", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "{}",
    });

    await POST(req);

    expect(rpc).toHaveBeenCalledWith("complete_signup_context_v1", {
      p_token_hash: null,
      p_marketing_email_consent: false,
    });
  });

  it("rejects unauthenticated requests with 401", async () => {
    createClient.mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null } }) },
      rpc: vi.fn(),
    });

    const response = await POST(requestWithCookie("raw"));
    expect(response.status).toBe(401);
  });

  it("returns 500 when the RPC fails and keeps the cookie untouched", async () => {
    createClient.mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: "user-1" } } }) },
      rpc: vi.fn().mockResolvedValue({ data: null, error: { message: "boom" } }),
    });

    const response = await POST(requestWithCookie("raw-token-abc"));
    expect(response.status).toBe(500);
    expect(response.headers.get("set-cookie")).toBeNull();
  });
});