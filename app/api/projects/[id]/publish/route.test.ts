import { beforeEach, describe, expect, it, vi } from "vitest";

const { requireOwnedProject, loadPrimaryProjectOfferContext } = vi.hoisted(() => ({
  requireOwnedProject: vi.fn(),
  loadPrimaryProjectOfferContext: vi.fn(),
}));

vi.mock("@/lib/api/project-access", () => ({ requireOwnedProject }));
vi.mock("@/lib/offers/project-offer-context", () => ({
  loadPrimaryProjectOfferContext,
}));
vi.mock("@/lib/workflow/project-workflow", () => ({
  deriveProjectWorkflow: () => ({ canPublish: true, blockers: [], checks: [] }),
}));

import { continueAfterPublicationLookup, POST } from "./route";

describe("publication lookup guard", () => {
  it("returns safe db_error and does not continue to publish on lookup error", async () => {
    const publishRpc = vi.fn();

    const response = await continueAfterPublicationLookup(
      { data: null, error: { message: "database secret detail" } },
      publishRpc,
    );

    expect(response).toBeInstanceOf(Response);
    if (!(response instanceof Response)) throw new Error("Expected Response");
    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({
      error: {
        message: "Failed to load existing publication",
        code: "db_error",
      },
    });
    expect(publishRpc).not.toHaveBeenCalled();
  });

  it("continues for a first publish with no existing row and no error", async () => {
    const publishRpc = vi.fn().mockResolvedValue("published");

    await expect(
      continueAfterPublicationLookup({ data: null, error: null }, publishRpc),
    ).resolves.toBe("published");
    expect(publishRpc).toHaveBeenCalledWith(null);
  });
});

describe("POST failure status restoration", () => {
  const previousPublishedAt = "2026-07-01T12:34:56.000Z";

  beforeEach(() => {
    vi.clearAllMocks();
    loadPrimaryProjectOfferContext.mockResolvedValue(null);
  });

  function setup(failure: "lookup" | "rpc" | "throw") {
    const restorationPatches: Record<string, unknown>[] = [];
    let projectsUpdateCount = 0;
    const supabase = {
      from: vi.fn((table: string) => {
        if (table === "project_states") return { select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: null, error: null }) }) }) };
        if (table === "outlines") return { select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: null, error: null }) }) }) };
        if (table === "ebook_sections") return { select: () => ({ eq: () => ({ order: async () => ({ data: [{ id: "section-1", project_id: "project-1", outline_section_id: "outline-1", position: 1, title: "Section", content_html: "<p>Ready</p>", word_count: 1, status: "generated", updated_at: previousPublishedAt }], error: null }) }) }) };
        if (table === "projects") return { update: (patch: Record<string, unknown>) => ({ eq: async () => { projectsUpdateCount += 1; if (projectsUpdateCount > 1) restorationPatches.push(patch); return { error: null }; } }) };
        if (table === "published_ebooks") return { select: () => ({ eq: () => ({ maybeSingle: async () => {
          if (failure === "throw") throw new Error("lookup exploded");
          return failure === "lookup" ? { data: null, error: { message: "lookup failed" } } : { data: { id: "pub-1", slug: "stable-slug", is_public: true }, error: null };
        } }) }) };
        throw new Error(`Unexpected table ${table}`);
      }),
      rpc: vi.fn().mockResolvedValue({ data: null, error: { message: "rpc failed" } }),
    };
    requireOwnedProject.mockResolvedValue({
      supabase,
      user: { id: "user-1" },
      project: { id: "project-1", status: "published", published_at: previousPublishedAt, ebook_type: "lead_magnet", title: "Published ebook", subtitle: null, author: "Author", cover_color: "#000000", final_cta: null, cta_url: null, cta_goal: null },
    });
    return restorationPatches;
  }

  it.each([
    ["publication lookup error", "lookup"],
    ["publish RPC error", "rpc"],
    ["thrown exception", "throw"],
  ] as const)("restores published status and published_at on %s", async (_name, failure) => {
    const restorationPatches = setup(failure);
    const response = await POST(new Request("http://localhost/api/projects/project-1/publish", { method: "POST", body: JSON.stringify({}) }), { params: Promise.resolve({ id: "project-1" }) });

    expect(response.status).toBeGreaterThanOrEqual(500);
    expect(restorationPatches).toHaveLength(1);
    expect(restorationPatches[0]).toMatchObject({ status: "published", published_at: previousPublishedAt });
  });
});

describe("POST claim-only publish", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    loadPrimaryProjectOfferContext.mockResolvedValue(null);
  });

  function successSetup(rpcImpl: (...args: unknown[]) => unknown) {
    const rpc = vi.fn().mockImplementation(rpcImpl);
    const supabase = {
      from: vi.fn((table: string) => {
        if (table === "project_states") return { select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: null, error: null }) }) }) };
        if (table === "outlines") return { select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: null, error: null }) }) }) };
        if (table === "ebook_sections") return { select: () => ({ eq: () => ({ order: async () => ({ data: [{ id: "section-1", project_id: "project-1", outline_section_id: "outline-1", position: 1, title: "Section", content_html: "<p>Ready</p>", word_count: 1, status: "generated", updated_at: "2026-07-01T12:34:56.000Z" }], error: null }) }) }) };
        if (table === "projects") return { update: () => ({ eq: async () => ({ error: null }) }) };
        if (table === "published_ebooks") return { select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: null, error: null }) }) }) };
        throw new Error(`Unexpected table ${table}`);
      }),
      rpc,
    };
    requireOwnedProject.mockResolvedValue({
      supabase,
      user: { id: "user-1" },
      project: { id: "project-1", status: "generated", published_at: null, ebook_type: "lead_magnet", title: "Published ebook", subtitle: null, author: "Author", cover_color: "#000000", final_cta: null, cta_url: null, cta_goal: null },
    });
    return rpc;
  }

  it("forces non-public even when the client requests is_public=true", async () => {
    const rpc = successSetup(() => ({ data: { id: "pub-1", slug: "stable-slug" }, error: null }));

    const response = await POST(new Request("http://localhost/api/projects/project-1/publish", { method: "POST", body: JSON.stringify({ is_public: true }) }), { params: Promise.resolve({ id: "project-1" }) });

    expect(response.status).toBe(200);
    expect(rpc).toHaveBeenCalledWith(
      "publish_project_atomic_v1",
      expect.objectContaining({ p_is_public: false }),
    );
  });

  it("never sends a public flag even without a visibility choice from the client", async () => {
    const rpc = successSetup(() => ({ data: { id: "pub-1", slug: "eb-slug-2" }, error: null }));

    const response = await POST(new Request("http://localhost/api/projects/project-1/publish", { method: "POST", body: JSON.stringify({}) }), { params: Promise.resolve({ id: "project-1" }) });

    expect(response.status).toBe(200);
    expect(rpc).toHaveBeenCalledWith(
      "publish_project_atomic_v1",
      expect.objectContaining({ p_is_public: false }),
    );
  });
});
