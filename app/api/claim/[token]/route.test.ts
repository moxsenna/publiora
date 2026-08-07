import { beforeEach, describe, expect, it, vi } from "vitest";

const { createAdminClient, createClient, headers, rateLimit } = vi.hoisted(() => ({
  createAdminClient: vi.fn(),
  createClient: vi.fn(),
  headers: vi.fn(),
  rateLimit: vi.fn(),
}));

vi.mock("@/lib/supabase/admin", () => ({ createAdminClient }));
vi.mock("@/lib/supabase/server", () => ({ createClient }));
vi.mock("next/headers", () => ({ headers }));
vi.mock("@/lib/rate-limit", () => ({ rateLimit }));

import { GET, POST } from "./route";

function readyAdmin() {
  const tokenEq = vi.fn().mockReturnValue({
    maybeSingle: vi.fn().mockResolvedValue({
      data: {
        id: "link-1",
        token: "RAW-SECRET-TOKEN",
        ebook_id: "ebook-1",
        status: "active",
        expires_at: null,
        max_uses: null,
        used_count: 0,
      },
    }),
  });
  const ebookEq = vi.fn().mockReturnValue({
    maybeSingle: vi.fn().mockResolvedValue({
      data: {
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
      },
    }),
  });
  const admin = {
    from: vi.fn((table: string) => {
      if (table === "claim_links") return { select: vi.fn().mockReturnValue({ eq: tokenEq }) };
      if (table === "published_ebooks") return { select: vi.fn().mockReturnValue({ eq: ebookEq }) };
      throw new Error(`Unexpected table ${table}`);
    }),
  };
  return { admin, tokenEq };
}

function rpcClient(rpcImpl: ReturnType<typeof vi.fn>) {
  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: { id: "reader-1", email: "reader@example.com" } },
      }),
    },
    rpc: rpcImpl,
  };
}

const ebookResult = {
  id: "ebook-1",
  project_id: "project-1",
  slug: "aman",
  title: "Aman",
  author: "Ayu",
  subtitle: null,
  cover_color: "#123456",
  sections: [],
  published_at: "2026-01-01",
  total_readers: 1,
  active_claims: 0,
  is_public: false,
  cta_goal: null,
  final_cta: null,
  cta_url: null,
};

const entitlementResult = {
  id: "ent-1",
  reader_id: "reader-1",
  ebook_id: "ebook-1",
  claim_link_id: "link-1",
  ebook_title: "Aman",
  ebook_slug: "aman",
  cover_color: "#123456",
  author: "Ayu",
  created_at: "2026-01-01",
};

beforeEach(() => {
  vi.clearAllMocks();
  headers.mockResolvedValue(new Headers({ "x-real-ip": "127.0.0.1" }));
  rateLimit.mockReturnValue({ ok: true });
});

describe("claim preview GET", () => {
  it("keeps URL token lookup but never echoes raw token in ready preview", async () => {
    const { admin, tokenEq } = readyAdmin();
    createAdminClient.mockReturnValue(admin);

    const response = await GET(new Request("http://localhost/api/claim/url-token"), {
      params: Promise.resolve({ token: "url-token" }),
    });
    const body = await response.json();

    expect(tokenEq).toHaveBeenCalledWith("token", "URL-TOKEN");
    expect(body.status).toBe("ready");
    expect(body.ebook.slug).toBe("aman");
    expect(body).not.toHaveProperty("token");
    expect(JSON.stringify(body)).not.toContain("RAW-SECRET-TOKEN");
  });

  it("returns stable safe error without operational detail when preview lookup throws", async () => {
    const detail = "database host db.internal failed with password=secret";
    createAdminClient.mockImplementation(() => { throw new Error(detail); });
    const log = vi.spyOn(console, "error").mockImplementation(() => undefined);

    const response = await GET(new Request("http://localhost/api/claim/token"), {
      params: Promise.resolve({ token: "token" }),
    });

    const body = await response.json();
    expect(response.status).toBe(503);
    expect(body).toEqual({
      error: {
        message: "Layanan klaim sementara tidak tersedia.",
        code: "unavailable",
      },
    });
    expect(log).toHaveBeenCalled();
    expect(JSON.stringify(body)).not.toContain(detail);
    log.mockRestore();
  });
});

describe("claim POST rate limit", () => {
  it("returns stable safe message and code without retry timing detail", async () => {
    rateLimit.mockReturnValue({ ok: false, retryAfterSec: 37 });

    const response = await POST(new Request("http://localhost/api/claim/token", { method: "POST" }), {
      params: Promise.resolve({ token: "token" }),
    });

    expect(response.status).toBe(429);
    expect(await response.json()).toEqual({
      error: {
        message: "Terlalu banyak percobaan klaim. Coba lagi beberapa saat.",
        code: "rate_limited",
      },
    });
    expect(createClient).not.toHaveBeenCalled();
  });
});

describe("claim POST delegates to claim_ebook_access_v2", () => {
  it("passes normalized token to the RPC and returns claimed payload", async () => {
    const rpc = vi.fn().mockResolvedValue({
      data: {
        status: "claimed",
        ebook: ebookResult,
        entitlement: entitlementResult,
      },
      error: null,
    });
    createClient.mockResolvedValue(rpcClient(rpc));

    const response = await POST(new Request("http://localhost/api/claim/lower-token", { method: "POST" }), {
      params: Promise.resolve({ token: "lower-token" }),
    });

    expect(createAdminClient).not.toHaveBeenCalled();
    expect(rpc).toHaveBeenCalledWith("claim_ebook_access_v2", { p_token: "LOWER-TOKEN" });
    expect(await response.json()).toEqual({
      status: "claimed",
      ebook: ebookResult,
      entitlement: entitlementResult,
    });
  });

  it("maps already_owned from the RPC without extra admin writes", async () => {
    const rpc = vi.fn().mockResolvedValue({
      data: { status: "already_owned", ebook: ebookResult },
      error: null,
    });
    createClient.mockResolvedValue(rpcClient(rpc));

    const response = await POST(new Request("http://localhost/api/claim/token", { method: "POST" }), {
      params: Promise.resolve({ token: "token" }),
    });

    expect(createAdminClient).not.toHaveBeenCalled();
    expect(await response.json()).toEqual({
      status: "already_owned",
      ebook: ebookResult,
    });
  });

  it("maps not_found / revoked / expired / limit_reached statuses", async () => {
    for (const status of ["not_found", "revoked", "expired", "limit_reached"]) {
      const rpc = vi.fn().mockResolvedValue({ data: { status }, error: null });
      createClient.mockResolvedValue(rpcClient(rpc));

      const response = await POST(new Request("http://localhost/api/claim/token", { method: "POST" }), {
        params: Promise.resolve({ token: "token" }),
      });

      expect(await response.json()).toEqual({ status });
    }
  });

  it("fails safe with db_error when the RPC errors", async () => {
    const detail = "rpc claim_ebook_access_v2 failed with password=secret";
    const rpc = vi.fn().mockResolvedValue({ data: null, error: { message: detail } });
    createClient.mockResolvedValue(rpcClient(rpc));
    const log = vi.spyOn(console, "error").mockImplementation(() => undefined);

    const response = await POST(new Request("http://localhost/api/claim/token", { method: "POST" }), {
      params: Promise.resolve({ token: "token" }),
    });

    const body = await response.json();
    expect(response.status).toBe(500);
    expect(body).toEqual({
      error: { message: "Layanan klaim sementara tidak tersedia.", code: "db_error" },
    });
    expect(log).toHaveBeenCalled();
    expect(JSON.stringify(body)).not.toContain(detail);
    log.mockRestore();
  });

  it("fails safe with unavailable when the RPC returns an unknown status", async () => {
    const rpc = vi.fn().mockResolvedValue({ data: { status: "weird_status" }, error: null });
    createClient.mockResolvedValue(rpcClient(rpc));
    const log = vi.spyOn(console, "error").mockImplementation(() => undefined);

    const response = await POST(new Request("http://localhost/api/claim/token", { method: "POST" }), {
      params: Promise.resolve({ token: "token" }),
    });

    const body = await response.json();
    expect(response.status).toBe(503);
    expect(body).toEqual({
      error: { message: "Layanan klaim sementara tidak tersedia.", code: "unavailable" },
    });
    expect(log).toHaveBeenCalled();
    expect(JSON.stringify(body)).not.toContain("weird_status");
    log.mockRestore();
  });

  it("hides thrown backend detail behind stable unavailable error", async () => {
    const detail = "claim resolution failed: connection refused host=secret";
    createClient.mockImplementation(() => { throw new Error(detail); });
    const log = vi.spyOn(console, "error").mockImplementation(() => undefined);

    const response = await POST(new Request("http://localhost/api/claim/token", { method: "POST" }), {
      params: Promise.resolve({ token: "token" }),
    });

    const body = await response.json();
    expect(response.status).toBe(503);
    expect(body).toEqual({
      error: { message: "Layanan klaim sementara tidak tersedia.", code: "unavailable" },
    });
    expect(log).toHaveBeenCalled();
    expect(JSON.stringify(body)).not.toContain(detail);
    log.mockRestore();
  });
});