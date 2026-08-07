import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { createClient } = vi.hoisted(() => ({
  createClient: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({ createClient }));

import { PATCH } from "./route";

const NOW = "2026-08-07T12:00:00.000Z";

const DEFAULT_PROFILE = {
  marketing_email_consent: true,
  marketing_email_consent_at: NOW,
  marketing_email_consent_source: "account_settings",
};

function readyClient(result?: { data: unknown; error?: unknown }) {
  const maybeSingle = vi
    .fn()
    .mockResolvedValue(result ?? { data: DEFAULT_PROFILE, error: null });
  const select = vi.fn().mockReturnValue({ maybeSingle });
  const eq = vi.fn().mockReturnValue({ select });
  const update = vi.fn().mockReturnValue({ eq });
  const client = {
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: { id: "user-1" } } }),
    },
    from: vi.fn((_table: string) => ({ update })),
  };
  return { client, update, eq, select, maybeSingle };
}

function request(consent: unknown) {
  return new Request("http://localhost/api/profile/marketing-preferences", {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ marketing_email_consent: consent }),
  });
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date(NOW));
  createClient.mockReset();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("marketing preferences PATCH", () => {
  it("menolak tanpa sesi", async () => {
    createClient.mockReturnValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: null } }),
      },
    });

    const res = await PATCH(request(true));

    expect(res.status).toBe(401);
  });

  it("menolak body tanpa boolean marketing_email_consent", async () => {
    const { client } = readyClient();
    createClient.mockReturnValue(client);

    const missing = await PATCH(
      new Request("http://localhost", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({}),
      })
    );
    const notBoolean = await PATCH(request("yes"));

    expect(missing.status).toBe(400);
    expect(notBoolean.status).toBe(400);
  });

  it("hanya memperbarui kolom consent milik pengguna sendiri", async () => {
    const { client, update, eq } = readyClient();
    createClient.mockReturnValue(client);

    const res = await PATCH(request(true));

    expect(res.status).toBe(200);
    expect(update).toHaveBeenCalledWith({
      marketing_email_consent: true,
      marketing_email_consent_at: NOW,
      marketing_email_consent_source: "account_settings",
      updated_at: NOW,
    });
    expect(eq).toHaveBeenCalledWith("id", "user-1");
    expect(await res.json()).toEqual({ ok: true, profile: DEFAULT_PROFILE });
  });

  it("mencatat opt-out tanpa menyentuh origin atau lifecycle", async () => {
    const { client, update } = readyClient({
      data: {
        marketing_email_consent: false,
        marketing_email_consent_at: NOW,
        marketing_email_consent_source: "account_settings",
      },
    });
    createClient.mockReturnValue(client);

    const res = await PATCH(request(false));

    expect(res.status).toBe(200);
    const updateArgs = update.mock.calls[0][0] as Record<string, unknown>;
    expect(updateArgs.marketing_email_consent).toBe(false);
    expect(updateArgs).not.toHaveProperty("signup_origin");
    expect(updateArgs).not.toHaveProperty("initial_intent");
    expect(updateArgs).not.toHaveProperty("reader_activated_at");
    expect(updateArgs).not.toHaveProperty("creator_activated_at");
  });

  it("menjawab 500 saat database gagal", async () => {
    const { client } = readyClient({ data: null, error: new Error("boom") });
    createClient.mockReturnValue(client);

    const res = await PATCH(request(true));

    expect(res.status).toBe(500);
  });
});