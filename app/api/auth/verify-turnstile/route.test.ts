import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";
import { POST } from "./route";

describe("POST /api/auth/verify-turnstile", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    vi.restoreAllMocks();
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("bypasses check when TURNSTILE_SECRET_KEY is not set", async () => {
    delete process.env.TURNSTILE_SECRET_KEY;
    const req = new NextRequest("http://localhost:3000/api/auth/verify-turnstile", {
      method: "POST",
      body: JSON.stringify({ token: "any-token" }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data).toEqual({ ok: true, bypassed: true });
  });

  it("verifies successfully with Cloudflare when TURNSTILE_SECRET_KEY is configured", async () => {
    process.env.TURNSTILE_SECRET_KEY = "dummy-secret-key";

    globalThis.fetch = vi.fn().mockResolvedValue({
      json: vi.fn().mockResolvedValue({ success: true }),
    } as unknown as Response);

    const req = new NextRequest("http://localhost:3000/api/auth/verify-turnstile", {
      method: "POST",
      headers: { "cf-connecting-ip": "103.21.244.2" },
      body: JSON.stringify({ token: "valid-turnstile-token" }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data).toEqual({ ok: true });
    expect(globalThis.fetch).toHaveBeenCalledWith(
      "https://challenges.cloudflare.com/turnstile/v0/siteverify",
      expect.objectContaining({ method: "POST" })
    );
  });

  it("rejects when Cloudflare reports verification failure", async () => {
    process.env.TURNSTILE_SECRET_KEY = "dummy-secret-key";

    globalThis.fetch = vi.fn().mockResolvedValue({
      json: vi.fn().mockResolvedValue({ success: false }),
    } as unknown as Response);

    const req = new NextRequest("http://localhost:3000/api/auth/verify-turnstile", {
      method: "POST",
      body: JSON.stringify({ token: "invalid-token" }),
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.ok).toBe(false);
    expect(data.error).toContain("Verifikasi keamanan bot gagal");
  });
});
