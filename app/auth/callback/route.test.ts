import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET } from "./route";

const mockExchange = vi.fn();
const mockVerifyOtp = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    auth: {
      exchangeCodeForSession: mockExchange,
      verifyOtp: mockVerifyOtp,
    },
  })),
}));

describe("GET /auth/callback", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("redirects to sanitized next url on successful code exchange", async () => {
    mockExchange.mockResolvedValueOnce({ data: { session: {} }, error: null });
    const req = new Request("http://localhost:3000/auth/callback?code=valid-code&next=/dashboard");
    const res = await GET(req);

    expect(res.status).toBe(303);
    expect(res.headers.get("location")).toBe("http://localhost:3000/dashboard");
    expect(mockExchange).toHaveBeenCalledWith("valid-code");
  });

  it("prevents open-redirect to external URLs", async () => {
    mockExchange.mockResolvedValueOnce({ data: { session: {} }, error: null });
    const req = new Request("http://localhost:3000/auth/callback?code=valid-code&next=https://evil.com");
    const res = await GET(req);

    expect(res.status).toBe(303);
    expect(res.headers.get("location")).toBe("http://localhost:3000/dashboard");
  });

  it("prevents open-redirect using protocol-relative paths like //evil.com", async () => {
    mockExchange.mockResolvedValueOnce({ data: { session: {} }, error: null });
    const req = new Request("http://localhost:3000/auth/callback?code=valid-code&next=//evil.com");
    const res = await GET(req);

    expect(res.status).toBe(303);
    expect(res.headers.get("location")).toBe("http://localhost:3000/dashboard");
  });

  it("handles verifyOtp if token_hash and type query params are passed", async () => {
    mockVerifyOtp.mockResolvedValueOnce({ data: { session: {} }, error: null });
    const req = new Request("http://localhost:3000/auth/callback?token_hash=valid-hash&type=email&next=/reset-password");
    const res = await GET(req);

    expect(res.status).toBe(303);
    expect(res.headers.get("location")).toBe("http://localhost:3000/reset-password");
    expect(mockVerifyOtp).toHaveBeenCalledWith({
      token_hash: "valid-hash",
      type: "email",
    });
  });

  it("redirects to login error on failed code exchange", async () => {
    mockExchange.mockResolvedValueOnce({ data: { session: null }, error: new Error("Expired") });
    const req = new Request("http://localhost:3000/auth/callback?code=expired-code");
    const res = await GET(req);

    expect(res.status).toBe(303);
    expect(res.headers.get("location")).toBe("http://localhost:3000/login?error=auth_callback_failed");
  });

  it("redirects to login error on failed OTP verification", async () => {
    mockVerifyOtp.mockResolvedValueOnce({ data: { session: null }, error: new Error("Invalid token") });
    const req = new Request("http://localhost:3000/auth/callback?token_hash=bad-hash&type=recovery");
    const res = await GET(req);

    expect(res.status).toBe(303);
    expect(res.headers.get("location")).toBe("http://localhost:3000/login?error=auth_callback_failed");
  });

  it("redirects to login if neither code nor token_hash+type provided", async () => {
    const req = new Request("http://localhost:3000/auth/callback");
    const res = await GET(req);

    expect(res.status).toBe(303);
    expect(res.headers.get("location")).toBe("http://localhost:3000/login");
  });
});
