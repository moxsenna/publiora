import { beforeEach, describe, expect, it, vi } from "vitest";

const { createClient } = vi.hoisted(() => ({ createClient: vi.fn() }));

vi.mock("@/lib/supabase/server", () => ({ createClient }));

import { GET } from "./route";

function readyClient(row: Record<string, unknown> | null) {
  const user = { id: "user-1", email: "user@example.com" };
  createClient.mockResolvedValue({
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user }, error: null }),
    },
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          maybeSingle: vi.fn().mockResolvedValue({ data: row, error: null }),
        }),
      }),
    }),
  });
}

describe("GET /api/auth/me — profile mapping", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("memetakan atribusi, lifecycle, dan consent dari row profil", async () => {
    readyClient({
      id: "user-1",
      name: "Budi",
      email: "user@example.com",
      avatar_url: null,
      role: "user",
      plan_id: "creator",
      created_at: "2026-01-01T00:00:00Z",
      updated_at: "2026-01-02T00:00:00Z",
      signup_origin: "claim_link",
      initial_intent: "reader",
      first_claim_link_id: "link-1",
      first_claim_ebook_id: "ebook-1",
      first_claim_creator_id: "creator-1",
      reader_activated_at: "2026-01-03T00:00:00Z",
      creator_activated_at: null,
      creator_subscribed_at: null,
      marketing_email_consent: true,
      marketing_email_consent_at: "2026-01-01T00:00:00Z",
      marketing_email_consent_source: "claim_signup",
    });

    const res = await GET();
    expect(res.status).toBe(200);
    const { profile } = await res.json();

    expect(profile.id).toBe("user-1");
    expect(profile.plan).toBe("creator");
    expect(profile.signup_origin).toBe("claim_link");
    expect(profile.initial_intent).toBe("reader");
    expect(profile.first_claim_link_id).toBe("link-1");
    expect(profile.first_claim_ebook_id).toBe("ebook-1");
    expect(profile.first_claim_creator_id).toBe("creator-1");
    expect(profile.reader_activated_at).toBe("2026-01-03T00:00:00Z");
    expect(profile.creator_activated_at).toBeNull();
    expect(profile.marketing_email_consent).toBe(true);
    expect(profile.marketing_email_consent_source).toBe("claim_signup");
  });

  it("menurunkan nilai tidak dikenal ke default aman (origin, intent, plan, consent)", async () => {
    readyClient({
      id: "user-1",
      name: null,
      email: null,
      avatar_url: null,
      role: "root",
      plan_id: "enterprise",
      created_at: null,
      updated_at: null,
      signup_origin: "mystery",
      initial_intent: "bot",
      marketing_email_consent: undefined,
      marketing_email_consent_source: "hacked",
    });

    const res = await GET();
    const { profile } = await res.json();

    expect(profile.role).toBe("user");
    expect(profile.plan).toBe("free");
    expect(profile.signup_origin).toBe("unattributed");
    expect(profile.initial_intent).toBeNull();
    expect(profile.marketing_email_consent).toBe(false);
    expect(profile.marketing_email_consent_source).toBeNull();
  });

  it("memberi profil fallback aman saat row belum ada (tanpa menebak origin)", async () => {
    readyClient(null);

    const res = await GET();
    expect(res.status).toBe(200);
    const { user, profile } = await res.json();

    expect(user.id).toBe("user-1");
    expect(profile.id).toBe("user-1");
    expect(profile.plan).toBe("free");
    // Never infer attribution when there is no row.
    expect(profile.signup_origin).toBe("unattributed");
    expect(profile.first_claim_link_id).toBeNull();
    expect(profile.marketing_email_consent).toBe(false);
  });

  it("menolak tanpa sesi", async () => {
    createClient.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: null },
          error: { message: "no session" },
        }),
      },
    });

    const res = await GET();
    expect(res.status).toBe(401);
  });
});